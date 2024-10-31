import type { ChatMessage, LLM } from "llamaindex";
import { OpenAI, OpenAIAgent } from "llamaindex";
import { LLM_ID } from "../constants";
import { createAskUserTool } from "../tools/askUser";
import { createExecuteCommandTool } from "../tools/executeCommand";
import { getRelevantContext, MessageRoles } from "../utils/chatHistory";
import { loadConfig } from "../utils/config";
import { gatherContextData } from "../utils/contextUtils";
import {
  Database,
  insertAgentStep,
  insertConversation,
  updateConversationTotalTime,
} from "../utils/database";
import { formatUserMessage } from "../utils/formatting";
import { getOrPromptForAPIKey } from "../utils/getOrPromptForAPIKey";
import { logger, LogLevel } from "../utils/logger";
import { parseAgentResponse } from "../utils/parseAgentResponse";
import { initializeRun } from "../utils/runManager";
import { buildSystemMessage } from "./buildSystemMessage";

export const informUserTag = "inform_user";

async function initializeLLM(input: string): Promise<LLM> {
  const apiKey = await getOrPromptForAPIKey();
  if (!apiKey) {
    throw new Error("OpenAI API key not found. Please run the application again to set it up.");
  }

  const llm = new OpenAI({ apiKey, model: LLM_ID });
  logger.info(`Starting agent with input: ${input}`);
  return llm;
}

async function prepareMessages(
  input: string,
  runDir: string,
  contextData: { pwdOutput: string; lsOutput: string },
  config: object,
): Promise<ChatMessage[]> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: buildSystemMessage(runDir, contextData.pwdOutput, contextData.lsOutput, config),
    },
  ];

  const relevantContext = await getRelevantContext(input);
  if (relevantContext.length > 0) {
    messages.push({
      role: "system",
      content: "Relevant context from previous conversations:\n" + relevantContext.join("\n\n"),
    });
  } else {
    logger.debug("No relevant context found for the current query");
  }

  return messages;
}

async function executeUserTask(
  agent: OpenAIAgent,
  taskMessageContent: string,
  db: Database,
  conversationId: number,
): Promise<string> {
  let responseContent = "";
  let stepNumber = 0;

  const task = agent.createTask(taskMessageContent);
  for await (const stepOutput of task as any) {
    const stepStartTime = Date.now();
    try {
      const parsedResponse = parseAgentResponse(stepOutput);
      responseContent = parsedResponse.content;
      const stepExecutionTime = Date.now() - stepStartTime;
      await insertAgentStep(
        db,
        conversationId,
        stepNumber,
        responseContent,
        stepExecutionTime,
        MessageRoles.AGENT,
      );

      const informUserMatch = responseContent.match(
        new RegExp(`<${informUserTag}>([\\s\\S]*?)</${informUserTag}>`, "g"),
      );
      if (informUserMatch) {
        informUserMatch.forEach((match) => {
          const messageContent = match.replace(new RegExp(`</?${informUserTag}>`, "g"), "");
          console.log(formatUserMessage(messageContent));
        });
      }

      logger.debug(`Agent step ${stepNumber} output: ${responseContent}`);
      logger.debug(`Step ${stepNumber} completed. Execution time: ${stepExecutionTime}ms`);
    } catch (error) {
      if (error instanceof Error && error.message === "<input_aborted_by_user />") {
        logger.info("Task aborted by user.");
        return "Task aborted by user.";
      }
      logger.error(`Error in agent execution: ${error}`);
      throw error;
    } finally {
      stepNumber++;
    }
  }

  return responseContent;
}

async function finalizeAgentRun(
  db: Database,
  conversationId: number,
  totalTime: number,
  responseContent: string,
) {
  await updateConversationTotalTime(db, conversationId, totalTime);
  logger.info(`Final response: ${responseContent}`);
}
export async function runAgent(input: string, db: Database) {
  const startTime = Date.now();

  const llm = await initializeLLM(input);
  const runDir = initializeRun(input);
  const config = loadConfig();

  const contextData = await gatherContextData();
  const messages = await prepareMessages(input, runDir, contextData, config);

  const taskMessageContent = "Here is the user task description:\n\n" + input;
  const conversationId = await insertConversation(db, input);

  const executeCommandTool = createExecuteCommandTool(db, conversationId);
  const askUserTool = createAskUserTool(db, conversationId);

  const agent = new OpenAIAgent({
    llm,
    tools: [executeCommandTool, askUserTool],
    verbose: logger.getLevel() === LogLevel.DEBUG,
    chatHistory: messages,
  });

  let responseContent = await executeUserTask(agent, taskMessageContent, db, conversationId);

  const finalResultMatch = responseContent.match(/<final_result>([\\s\\S]*?)<\/final_result>/i);
  const finalResponse = finalResultMatch ? finalResultMatch[1].trim() : responseContent;

  const totalTime = Date.now() - startTime;
  await finalizeAgentRun(db, conversationId, totalTime, finalResponse);

  return finalResponse;
}
