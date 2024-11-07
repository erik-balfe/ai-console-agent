import type { ChatMessage, LLM } from "llamaindex";
import { OpenAI, OpenAIAgent } from "llamaindex";
import { LLM_ID, MESSAGE_ROLES } from "../constants";
import { createAskUserTool } from "../tools/askUser";
import { createExecuteCommandTool } from "../tools/executeCommand";
import { buildMemorySystemMessage, saveConversationDocument } from "../utils/chatHistory";
import { loadConfig } from "../utils/config";

import { DynamicContextData, gatherContextData } from "../cli/contextUtils";
import { getUserEvaluation } from "../cli/userEvaluation";
import {
  insertConversation as createConversation,
  Database,
  getAllConversationData,
  insertAgentStep,
  updateConversationFields,
} from "../utils/database";
import { formatAgentMessage } from "../utils/formatting";
import { generateConversationTitle } from "../utils/generateConversationTitle";
import { getCircularReplacer } from "../utils/getCircularReplacer";
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
  contextData: DynamicContextData,
  config: object,
): Promise<ChatMessage[]> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: buildSystemMessage(runDir, contextData, config),
    },
  ];

  const memorySystemMessage = await buildMemorySystemMessage(input);
  if (memorySystemMessage) {
    messages.push(memorySystemMessage);
  }

  return messages;
}

export function passInfoToUser(message: string) {
  const regexMatch = message.match(new RegExp(`<${informUserTag}>([\\s\\S]*?)</${informUserTag}>`, "g"));
  if (regexMatch) {
    regexMatch.forEach((match) => {
      const messageContent = match.replace(new RegExp(`</?${informUserTag}>`, "g"), "");
      console.write(formatAgentMessage(messageContent));
    });
  }
}

async function executeUserTask(
  agent: OpenAIAgent,
  taskMessageContent: string,
  db: Database,
  conversationId: number,
  maxRetries: number = 3,
): Promise<{
  responseContent: string;
  finalResponseText: string;
  finalResponseDetails: string;
}> {
  let tries = 0;
  let responseContent = "";
  let finalResponseText = "";
  let finalResponseDetails = "";

  while (tries < maxRetries) {
    let stepNumber = 0;
    logger.debug(`Executing user task. Try ${tries}`);

    // Execute the task
    const task = agent.createTask(taskMessageContent);
    for await (const stepOutput of task as any) {
      const stepStartTime = Date.now();
      try {
        const parsedResponse = parseAgentResponse(stepOutput);
        logger.debug("step output raw", JSON.stringify(stepOutput, getCircularReplacer(), 2));
        responseContent = parsedResponse.content;
        const stepExecutionTime = Date.now() - stepStartTime;

        await insertAgentStep(
          db,
          conversationId,
          stepNumber,
          responseContent,
          stepExecutionTime,
          MESSAGE_ROLES.AGENT,
        );

        passInfoToUser(responseContent);
        logger.debug(`Agent step ${stepNumber} output: ${responseContent}`);
        logger.debug(`Step ${stepNumber} completed. Execution time: ${stepExecutionTime}ms`);
      } catch (error) {
        if (error instanceof Error && error.message === "<input_aborted_by_user />") {
          logger.info("Task aborted by user.");
          return {
            responseContent: "Task aborted by user.",
            finalResponseText: "Task aborted by user.",
            finalResponseDetails: "",
          };
        }
        logger.error(`Error in agent execution: ${error}`);
        throw error;
      } finally {
        stepNumber++;
      }
    }

    // Parse the response
    const finalResultMatch = responseContent.match(/<final_result>([\s\S]*?)<\/final_result>/i);
    const finalResultDetailsMatch = responseContent.match(
      /<final_result_details>([\s\S]*?)<\/final_result_details>/i,
    );

    finalResponseText =
      finalResultMatch && finalResultMatch[1] ? finalResultMatch[1].trim() : responseContent;
    finalResponseDetails =
      finalResultDetailsMatch && finalResultDetailsMatch[1] ? finalResultDetailsMatch[1].trim() : "";

    // If we have a valid response, break the loop
    if (finalResponseText) {
      break;
    }

    // Add message for retry
    if (tries < maxRetries - 1) {
      const requireActionText =
        "Your message is not a tool call, final answer and no task is enqueued. Please make one of these actions";
      agent.chatHistory.push({ role: "user", content: requireActionText });
    }

    tries++;
  }

  return {
    responseContent,
    finalResponseText,
    finalResponseDetails,
  };
}

async function getRelevancy({ messages, toolCalls, conversationData }: any): Promise<number> {
  // Mock function for relevancy score
  return 1;
}

async function getFaithfulness({ messages, toolCalls, conversationData }: any): Promise<number> {
  // Mock function for faithfulness score
  return 1;
}

async function getCorrectness({ messages, toolCalls, conversationData }: any): Promise<number> {
  // Mock function for correctness score
  return 1;
}

async function finalizeAgentRun(
  db: Database,
  conversationId: number,
  totalTime: number,
  { rawResponse, result, details }: { rawResponse: string; result: string; details: string },
  input: string,
): Promise<void> {
  const fullConversation = getAllConversationData(db, conversationId);
  logger.debug(`Last message raw: ${rawResponse}`);
  const message = formatAgentMessage(result + "\n\n" + details);
  console.write(message);

  const title = await generateConversationTitle(fullConversation, {
    apiKey: await getOrPromptForAPIKey(),
    modelName: LLM_ID,
  });
  const userScore = getUserEvaluationScore();

  await updateConversationFields(db, {
    conversationId,
    title: await title,
    userFeedback: await userScore,
    totalTime,
    correctness: await getCorrectness(fullConversation),
    faithfulness: await getFaithfulness(fullConversation),
    relevancy: await getRelevancy(fullConversation),
    retrievalCount: 0,
    lastRetrieved: null,
    response: rawResponse,
  });

  await saveConversationDocument(db, conversationId);
}

export async function runAgent(input: string, db: Database) {
  const startTime = Date.now();

  const llm = await initializeLLM(input);
  const runDir = initializeRun(input);
  const config = loadConfig();

  const contextData = await gatherContextData();
  const messages = await prepareMessages(input, runDir, contextData, config);

  const taskMessageContent = "Here is The App's user query:\n\n" + input;
  const conversationId = await createConversation(db, input, startTime);

  const executeCommandTool = createExecuteCommandTool(db, conversationId);
  const askUserTool = createAskUserTool(db, conversationId);

  const agent = new OpenAIAgent({
    llm,
    tools: [executeCommandTool, askUserTool],
    verbose: logger.getLevel() === LogLevel.DEBUG,
    chatHistory: messages,
  });

  const { responseContent, finalResponseText, finalResponseDetails } = await executeUserTask(
    agent,
    taskMessageContent,
    db,
    conversationId,
  );

  const totalTime = Date.now() - startTime;

  await finalizeAgentRun(
    db,
    conversationId,
    totalTime,
    { rawResponse: responseContent, result: finalResponseText, details: finalResponseDetails },
    input,
  );

  return finalResponseText;
}

async function getUserEvaluationScore() {
  const userEvaluationNumber = await getUserEvaluation();
  const score = normalizeUserEvaluationScore(userEvaluationNumber, [1, 5], [0, 2]);
  return score;
}

function normalizeUserEvaluationScore(
  userEvaluationScore: number,
  initialRange: [number, number] = [1, 5],
  targetRange: [number, number] = [0, 2],
): number {
  const [initialMin, initialMax] = initialRange;
  const [targetMin, targetMax] = targetRange;

  // Validate input score within initial range
  if (userEvaluationScore < initialMin || userEvaluationScore > initialMax) {
    throw new Error(
      `Score ${userEvaluationScore} is out of the initial range [${initialMin}, ${initialMax}].`,
    );
  }

  const normalizedValue =
    ((userEvaluationScore - initialMin) / (initialMax - initialMin)) * (targetMax - targetMin) + targetMin;

  return normalizedValue;
}
