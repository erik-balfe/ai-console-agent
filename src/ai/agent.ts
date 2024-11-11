import type { ChatMessage } from "llamaindex";
import { OpenAIAgent } from "llamaindex";
import { DynamicContextData, gatherContextData } from "../cli/contextUtils";
import { LLM_ID, MESSAGE_ROLES, MODEL_PRICES } from "../constants";
import { getCorrectness, getFaithfulness, getRelevancy } from "../features/userScore/evaluations/evaluations";
import { getUserEvaluationScore } from "../features/userScore/getUserEvaluationScore";
import { askUserCallback } from "../tools/askUser";
import { createExecuteCommandTool } from "../tools/executeCommand";
import { AppConfig, loadConfig } from "../utils/config";
import {
  insertConversation as createConversation,
  Database,
  getAllConversationData,
  insertMessage,
  updateConversationFields,
} from "../utils/database";
import { formatAgentMessage } from "../utils/formatting";
import { generateConversationTitle } from "../utils/generateConversationTitle";
import { getApiKeyForModel, getOrPromptForAPIKey } from "../utils/getOrPromptForAPIKey";
import { UsageCostResult } from "../utils/interface";
import { logger, LogLevel, LogLevelType } from "../utils/logger";
import { parseLLMResponse } from "../utils/parseLLMResponse";
import { initializeRun } from "../utils/runManager";
import { buildSystemMessage } from "./buildSystemMessage";
import { getStoredConversationDataStrins, saveConversationDocument } from "./chatHistory";
import { getAiAgent } from "./getAiAgent";
import { parseAgentMessage, ParsedAgentMessage } from "./parseAgentResponseContent";

export async function agentLoop(consoleInput: string, db: Database, appConfig: AppConfig) {
  let questionForUser: string = "You can type your query here or exit the program:";
  let userQuery = consoleInput;
  let parsedAgentAnswer;
  let initialConversationQuery;

  while (!initialConversationQuery?.cancelled) {
    if (!userQuery) {
      initialConversationQuery = await askUserCallback({
        question: questionForUser,
      });

      if (initialConversationQuery.cancelled) {
        logger.info("User cancelled the query");
        break;
      }
      userQuery = initialConversationQuery.answer;
    }
    const startTime = Date.now();
    const conversationId = await createConversation(db, userQuery, startTime);

    do {
      logger.debug("Running agent with user query");

      const agentResponse = await runAgent(
        userQuery,
        db,
        appConfig.model,
        appConfig.logLevel,
        conversationId,
      );

      parsedAgentAnswer = agentResponse.parsedAgentMessage;
      logger.info(`Agent response received: ${JSON.stringify(parsedAgentAnswer)}`);

      // Always print informUserMessages if they exist
      if (parsedAgentAnswer.informUserMessages.length > 0) {
        parsedAgentAnswer.informUserMessages.forEach((message) => {
          console.write(formatAgentMessage(message));
        });
      }

      if (parsedAgentAnswer.taskComplete) {
        logger.info("agent confirms task is complete");
        userQuery = "";
        break;
      }

      // Handle user interaction
      if (parsedAgentAnswer.questionToUser) {
        logger.debug("Agent asked a follow-up question");
        const userResponse = await askUserCallback(parsedAgentAnswer.questionToUser);
        userQuery = userResponse.answer;
        logger.info(`User answered: ${userQuery}`);
      } else {
        // If there's no specific question but we need user input
        const userMessage = await askUserCallback({
          question: "Do you want to continue or is there anything else you'd like me to do?",
        });
        userQuery = userMessage.answer;
        if (userMessage.cancelled) {
          console.log("Saving conversation data and exiting");
        }
      }
    } while (!parsedAgentAnswer?.taskComplete);
  }
}

export async function runAgent(
  input: string,
  db: Database,
  model: string,
  logLevel: LogLevelType,
  conversationId: number,
) {
  logger.debug("Starting runAgent");
  const startTime = Date.now();

  if (input === "<input_aborted_by_user />") {
    input = "<service_message>User expressed explicit intent to exit the program.</service_message>";
  }
  const apiKey = await getApiKeyForModel(model);
  if (!apiKey) {
    logger.error("No API key found");
    throw new Error("LLM API key not found. Please run the application again to set it up.");
  }

  const runDir = initializeRun(input);
  const config = loadConfig();
  const contextData = await gatherContextData();
  const messages = await prepareMessages(input, runDir, contextData, config, db, conversationId);
  const taskMessageContent = `
    Now, please process the following user query:
    <user_query>
    ${input}
    </user_query>`;
  logger.debug("Creating conversation in DB");
  const executeCommandTool = createExecuteCommandTool(db, conversationId);
  logger.debug("Initializing OpenAI agent");
  const agent = getAiAgent({
    apiKey,
    modelId: model,
    tools: [executeCommandTool],
  });

  logger.debug("Executing user task");
  const { responseContent, parsedAgentMessage, totalCost } = await executeTask(
    agent,
    taskMessageContent,
    db,
    conversationId,
    messages,
    model,
  );

  const totalTime = Date.now() - startTime;
  logger.debug(`Task completed in ${totalTime}ms`);

  if (parsedAgentMessage.taskComplete) {
    logger.debug("Finalizing agent run");
    await finalizeAgentRun(db, conversationId, totalTime, responseContent, input);
  }

  return { parsedAgentMessage, responseContent, totalCost };
}

async function prepareMessages(
  userQuery: string,
  runDir: string,
  contextData: DynamicContextData,
  config: object,
  db: Database,
  conversationId: number,
): Promise<ChatMessage[]> {
  logger.debug("Building system message");
  const { memories, chatHistory } = await getStoredConversationDataStrins(userQuery, db, conversationId);
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: buildSystemMessage(runDir, contextData, config, userQuery, memories, chatHistory),
    },
  ];

  return messages;
}

async function executeTask(
  agent: OpenAIAgent,
  userQuery: string,
  db: Database,
  conversationId: number,
  messages: ChatMessage[],
  model: string,
) {
  let responseContent: string | null = null;
  let lastTextContent: string | null = null; // Keep track of the last meaningful text message
  let parsedAgentMessage: ParsedAgentMessage | null = null;
  let stepNumber = 0;
  let totalCost = 0;

  logger.debug("Starting task execution");

  const task = agent.createTask(userQuery, false, logger.getLevel() === LogLevel.DEBUG, messages);

  for await (const stepOutput of task as any) {
    const stepStartTime = Date.now();
    try {
      logger.debug(`Processing step ${stepNumber}`);
      const parsedResponse = parseLLMResponse(stepOutput);
      if (parsedResponse.usage) {
        const costInfo = countUsageCost(parsedResponse.usage, model);
        totalCost += costInfo.costUSD;
        logger.debug(
          `Step cost: $${costInfo.costUSD.toFixed(6)}, Total cost so far: $${totalCost.toFixed(6)}`,
        );
      }
      responseContent = parsedResponse.content;

      if (responseContent) {
        // Store the last meaningful text content
        lastTextContent = responseContent;

        const stepExecutionTime = Date.now() - stepStartTime;
        logger.debug(`Step ${stepNumber} execution time: ${stepExecutionTime}ms`);

        await insertMessage(
          db,
          conversationId,
          stepNumber,
          responseContent,
          stepExecutionTime,
          MESSAGE_ROLES.AGENT,
        );

        parsedAgentMessage = parseAgentMessage(responseContent);

        if (parsedAgentMessage.informUserMessages.length > 0) {
          parsedAgentMessage.informUserMessages.forEach((message) => {
            console.write(formatAgentMessage(message));
          });
        }
        stepNumber++;
      }
    } catch (error) {
      if (error instanceof Error && error.message === "<input_aborted_by_user />") {
        logger.info("Task aborted by user");
        await insertMessage(db, conversationId, stepNumber, "Task aborted by user.", 0, MESSAGE_ROLES.USER);
      }
      logger.error(`Error in agent execution: ${error}`);
      throw error;
    }
  }

  // Use the last meaningful text message instead of the potentially empty final message
  return {
    responseContent: lastTextContent ?? "",
    parsedAgentMessage: parsedAgentMessage as any,
    totalCost,
  };
}

/**
 * Finalizes an agent run by storing results and gathering feedback.
 *
 * @param db - Database instance for storing conversation data
 * @param conversationId - Unique identifier for the conversation
 * @param totalTime - Total execution time in milliseconds
 * @param {Object} params - Response data parameters
 * @param {string} params.rawResponse - Raw response from the agent
 * @param {string} params.result - Final processed result text
 * @param {string} [params.details] - Optional additional details about the result
 * @param input - Original user input that initiated the conversation
 *
 * @remarks
 * - Saves final results to database with evaluation scores and generated title
 * - Stores full conversation history in vector database for retrieval
 * - Collects and records user feedback on conversation quality
 * - Updates conversation metadata including execution time and response metrics
 */
async function finalizeAgentRun(
  db: Database,
  conversationId: number,
  totalTime: number,
  finalResponse: string,
  input: string,
): Promise<void> {
  logger.debug("Starting finalization");
  const fullConversation = getAllConversationData(db, conversationId);
  logger.debug(`Last message raw: ${finalResponse}`);

  logger.debug("Generating conversation title");
  const title = await generateConversationTitle(fullConversation, {
    apiKey: await getOrPromptForAPIKey(LLM_ID),
    modelName: LLM_ID,
  });

  logger.debug("Getting user evaluation score");
  const userScore = getUserEvaluationScore();

  logger.debug("Updating conversation fields");
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
    response: finalResponse,
  });

  logger.debug("Saving conversation document");
  await saveConversationDocument(db, conversationId);
  logger.debug("Finalization complete");
}

function countUsageCost(usage: Record<string, number>, model: string): UsageCostResult {
  // Get model pricing from the current model being used
  const modelConfig = MODEL_PRICES[model] ?? MODEL_PRICES["gpt-4o-mini"]; // fallback to a default model

  // Normalize token counts from different possible field names
  const inputTokens = usage.input_tokens || usage.prompt_tokens || 0;
  const outputTokens = usage.output_tokens || usage.completion_tokens || 0;

  // Calculate costs
  const inputCost = inputTokens * modelConfig.price.input;
  const outputCost = outputTokens * modelConfig.price.output;
  const totalCost = inputCost + outputCost;

  return {
    costUSD: totalCost,
    details: {
      inputTokens,
      outputTokens,
      inputCost,
      outputCost,
      totalCost,
    },
  };
}
