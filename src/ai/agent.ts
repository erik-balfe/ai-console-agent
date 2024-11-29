import type { ChatMessage } from "llamaindex";
import { OpenAIAgent } from "llamaindex";
import { DynamicContextData, gatherContextData } from "../cli/contextUtils";
import { ContextAllocation, INACTIVITY_TIMEOUT, MESSAGE_ROLES, WEAK_MODEL_ID } from "../constants";
import { getCorrectness, getFaithfulness, getRelevancy } from "../features/userScore/evaluations/evaluations";
import { getUserEvaluationScore } from "../features/userScore/getUserEvaluationScore";
import { askUserCallback, UserCliResponse } from "../tools/askUser";
import { createExecuteCommandTool } from "../tools/executeCommand";
import { createWaitTool } from "../tools/wait";
import { AppConfig, ConfigWithMetadata, loadConfig } from "../utils/config";
import { countUsageCost } from "../utils/countUsageCost";
import {
  Database,
  getAllConversationData,
  getLastConversationEntry,
  insertConversation,
  insertMessage,
  updateConversationFields,
} from "../utils/database";
import { formatAgentMessage } from "../utils/formatting";
import { generateConversationTitle } from "../utils/generateConversationTitle";
import { getOrPromptForAPIKey } from "../utils/getOrPromptForAPIKey";
import { debug, error, info } from "../utils/logger";
import { parseLLMResponse } from "../utils/parseLLMResponse";
import { initializeRun } from "../utils/runManager";
import { buildConstantSystemMessage, bulidVariableSystemMessage } from "./buildSystemMessage";
import { constructChatHistory } from "./chatHistory";
import { getAiAgent } from "./getAiAgent";
import { saveConversationDocument } from "./memories/memories";
import { parseAgentMessage, ParsedAgentMessage } from "./parseAgentResponseContent";

export async function getConversationId(
  db: Database,
  userQuery: string,
  newConversation: boolean,
): Promise<number> {
  debug("Fetching last interaction record from the database.");
  const lastInteractionRecord = getLastConversationEntry(db);
  debug(`Last interaction record: ${JSON.stringify(lastInteractionRecord)}`);

  let conversationId: number;

  if (newConversation || !lastInteractionRecord?.conversationId) {
    debug("No previous interaction found. Creating a new conversation entry.");
    conversationId = await insertConversation(db, userQuery, Date.now());
    debug(`New conversation ID created: ${conversationId}`);
    return conversationId;
  }

  const timeSinceLastInteraction = Date.now() - lastInteractionRecord.timestamp;
  debug(`Time since last interaction: ${timeSinceLastInteraction}ms`);

  if (timeSinceLastInteraction < INACTIVITY_TIMEOUT) {
    debug("Continuing existing conversation.");
    conversationId = lastInteractionRecord.conversationId;
    debug(`Existing conversation ID: ${conversationId}`);
  } else {
    debug("Inactivity timeout exceeded. Creating a new conversation entry.");
    conversationId = await insertConversation(db, userQuery, Date.now());
    debug(`New conversation ID created: ${conversationId}`);
  }

  debug(`Returning conversation ID: ${conversationId}`);
  return conversationId;
}

export async function agentLoop(
  consoleInput: string,
  db: Database,
  appConfig: AppConfig,
  contextAllocation: ContextAllocation,
  newConversation: boolean,
) {
  let questionForUser: string = "What you your task or question to Ai-console-agent?:";
  let userQuery = consoleInput;
  let agentMessage;
  let userMessage: UserCliResponse | null = {
    cancelled: false,
    exitProgram: false,
    answer: consoleInput,
    duration: 0,
  };

  // cycle through different conversation
  while (!userMessage?.exitProgram) {
    const startTime = Date.now();
    let conversationCost = 0;
    if (!userQuery || !userMessage || userMessage.cancelled) {
      userMessage = await askUserCallback({
        question: questionForUser,
      });
      userQuery = userMessage.answer;
    }

    if (userMessage.exitProgram) {
      debug("User pressed exit program");
      break;
    }
    if (userMessage.cancelled) {
      debug("User cancelled the conversation");
      continue;
    }

    const conversationId = await getConversationId(db, userQuery, newConversation);
    debug(`Conversation ID: ${conversationId}`);
    debug(`Conversation ID raw: ${JSON.stringify(conversationId)}`);
    if (!conversationId) {
      throw new Error("Conversation ID is not a number");
    }
    // cycle throught question-answer message pairs in the conversation
    do {
      debug("Running agent with user query");
      agentMessage = await runAgent(userQuery, db, appConfig.model, conversationId, contextAllocation);
      conversationCost += agentMessage.cost;
      info(`Agent task response received: ${JSON.stringify(agentMessage)}`);
      console.write(formatAgentMessage(agentMessage.responseContent));
      if (agentMessage.parts.taskComplete) {
        info("agent decided to end the conversation");
        continue;
      }

      // Handle user interaction
      if (agentMessage.parts.questionToUser) {
        debug("Agent asked a follow-up question");
        userMessage = await askUserCallback(agentMessage.parts.questionToUser);
        userQuery = userMessage.answer;
        info(`User answered: ${JSON.stringify(userMessage)}`);
      } else {
        userMessage = await askUserCallback({
          question: "User:",
        });
        userQuery = userMessage.answer;
      }
      if (userMessage.cancelled) {
        debug("Saving conversation data");
      }
    } while (!agentMessage?.taskComplete && !userMessage?.cancelled && !userMessage.exitProgram);

    info(`Conversation complete. Cost: $${conversationCost.toFixed(3)}`);
    const duration = Date.now() - startTime;
    await finalizeAgentRun(db, conversationId, duration, agentMessage.responseContent);
    if (!userMessage?.exitProgram) {
      userQuery = "";
      userMessage = null;
      agentMessage = null;
    }
  }
}

export async function runAgent(
  input: string,
  db: Database,
  model: string,
  conversationId: number,
  contextAllocation: ContextAllocation,
) {
  debug("Starting runAgent");
  const startTime = Date.now();

  const apiKey = await getOrPromptForAPIKey(model);
  if (!apiKey) {
    error("No API key found");
    throw new Error("LLM API key not found. Please run the application again to set it up.");
  }

  const runDir = initializeRun(input);
  const config = loadConfig();
  const contextData = await gatherContextData();
  const messages = await prepareMessages(
    input,
    runDir,
    contextData,
    config,
    db,
    conversationId,
    contextAllocation,
  );
  const taskMessageContent = `
    Now, please process the following user query:
    <user_query>
    ${input}
    </user_query>`;
  debug("Creating conversation in DB");
  const executeCommandTool = createExecuteCommandTool(db, conversationId);
  const waitTool = createWaitTool(db, conversationId);
  debug("Initializing OpenAI agent");
  const agent = getAiAgent({
    apiKey,
    modelId: model,
    tools: [executeCommandTool, waitTool],
  });
  debug("Preparing to send request to LLM API");
  messages.forEach((message, index) => {
    const contentPreview =
      message.content.length > 360
        ? `${message.content.slice(0, 300)}...[TRUNCATED]...${message.content.slice(-60)}`
        : message.content;
    debug(
      `Message #${index + 1}: role=${message.role}, content="${contentPreview}", length=${message.content.length}`,
    );

    if (message.options && message.options.toolCall) {
      message.options.toolCall.forEach((toolCall, callIndex) => {
        debug(
          `Tool Call #${callIndex + 1} for message #${index + 1}: toolName=${toolCall.name}, input=${JSON.stringify(
            toolCall.input,
          )}`,
        );
      });
    }

    if (message.options && message.options.toolResult) {
      debug(
        `Tool Result for message #${index + 1}: result=${JSON.stringify(
          message.options.toolResult.result.slice(0, 300),
        )}`,
      );
    }
  });
  debug("Task message content to be sent: ");
  if (taskMessageContent.length > 360) {
    debug(
      `Role=user, content="${taskMessageContent.slice(0, 300)}...[LOG_TRUNCATED]...${taskMessageContent.slice(-60)}", length=${taskMessageContent.length}`,
    );
  } else {
    debug(`Role=user, content="${taskMessageContent}", length=${taskMessageContent.length}`);
  }
  const { responseContent, parts, cost } = await executeTask(
    agent,
    taskMessageContent,
    db,
    conversationId,
    messages,
    model,
  );

  const totalTime = Date.now() - startTime;
  debug(`Task completed in ${totalTime}ms`);

  return { parts, responseContent, cost };
}

async function prepareMessages(
  userQuery: string,
  runDir: string,
  contextData: DynamicContextData,
  config: ConfigWithMetadata,
  db: Database,
  conversationId: number,
  contextAllocation: ContextAllocation,
): Promise<ChatMessage[]> {
  debug("Building system message");

  // memeories must be added here when stage 1 is ready
  // const memories = await getMemories(userQuery);

  const chatHistory = await constructChatHistory(db, conversationId, contextAllocation.chatHistory);
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: buildConstantSystemMessage(),
      options: {
        cache_control: {
          type: "ephemeral",
        },
      },
    },
    {
      role: "system",
      content: bulidVariableSystemMessage(runDir, contextData, config, userQuery),
    },
    ...chatHistory,
  ];

  debug("messages length, (symbols):", JSON.stringify(messages).length);
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
  let taskCost = 0;

  debug("Starting task execution");

  const task = agent.createTask(userQuery, false, false, messages);

  for await (const stepOutput of task as any) {
    const stepStartTime = Date.now();
    try {
      debug(`Processing step ${stepNumber}`);
      const parsedResponse = parseLLMResponse(stepOutput);
      if (parsedResponse.usage) {
        const costInfo = countUsageCost(parsedResponse.usage, model);
        taskCost += costInfo.costUSD;
        info(`Step cost: $${costInfo.costUSD.toFixed(6)}, Total cost so far: $${taskCost.toFixed(6)}`);
      }
      responseContent = parsedResponse.content;

      if (responseContent) {
        // Store the last meaningful text content
        lastTextContent = responseContent;

        const stepExecutionTime = Date.now() - stepStartTime;
        debug(`Step ${stepNumber} execution time: ${stepExecutionTime}ms`);

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
        info("Task aborted by user");
        await insertMessage(db, conversationId, stepNumber, "Task aborted by user.", 0, MESSAGE_ROLES.USER);
      }
      error(`Error in agent execution: ${error}`);
      throw error;
    }
  }

  // Use the last meaningful text message instead of the potentially empty final message
  return {
    responseContent: lastTextContent ?? "",
    parts: parsedAgentMessage,
    cost: taskCost,
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
): Promise<void> {
  debug("Starting finalization");
  const fullConversation = getAllConversationData(db, conversationId);
  debug(`Last message raw: ${finalResponse}`);

  debug("Generating conversation title");
  const title = await generateConversationTitle(fullConversation, {
    apiKey: await getOrPromptForAPIKey(WEAK_MODEL_ID),
    modelName: WEAK_MODEL_ID,
  });

  debug("Getting user evaluation score");
  const userScore = getUserEvaluationScore();

  debug("Updating conversation fields");
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

  debug("Saving conversation document");
  await saveConversationDocument(db, conversationId);
  debug("Finalization complete");
}
