import { ChatMessage } from "llamaindex";
import { CONTEXT_ALLOCATION, ContextAllocationItem } from "../constants";
import { Database, getRecentConversationsData } from "../utils/database";
import { ConversationEntry } from "../utils/interface";
import { logger } from "../utils/logger";

function constructFormattedChatHistory(sortedMessagesAndToolCalls: any[]): ChatMessage[] {
  const chatHistory: ChatMessage[] = [];

  sortedMessagesAndToolCalls.forEach((current, index) => {
    if ("role" in current) {
      // Regular message
      chatHistory.push({
        role: current.role,
        content: current.content,
      });
      logger.debug(`Message [${index}] Role: ${current.role}, Content: ${current.content.slice(0, 50)}...`);
    } else if ("toolCallId" in current) {
      // Tool call and result
      logger.debug(
        `Tool Call [${index}] ID: ${current.toolCallId}, Name: ${current.toolName}, Input: ${JSON.stringify(current.inputParams)}`,
      );
      logger.debug(`Tool Result [${index}] ID: ${current.toolCallId}, Output: ${current.output}`);

      const toolCallMessage: ChatMessage = {
        role: "assistant",
        content: "",
        options: {
          toolCall: [{ id: current.toolCallId, name: current.toolName, input: current.inputParams }],
        },
      };
      chatHistory.push(toolCallMessage);

      const toolResultMessage: ChatMessage = {
        role: "assistant",
        content: "",
        options: {
          toolResult: { id: current.toolCallId, result: current.output, isError: false },
        },
      };
      chatHistory.push(toolResultMessage);
    }
  });

  return chatHistory;
}

export async function constructChatHistory(
  db: Database,
  conversationId: number,
  contextAllocation: ContextAllocationItem,
): Promise<ChatMessage[]> {
  const lastConversationsData = getRecentConversationsData(db);
  const sortedMessagesAndToolCalls = lastConversationsData.entries;
  const { conversations } = lastConversationsData;
  logger.debug("sortedMessagesAndToolCalls:", sortedMessagesAndToolCalls.length);

  // Enhanced logging for conversation history
  sortedMessagesAndToolCalls.forEach((item, index) => {
    if ("role" in item) {
      // Log message roles and content
      logger.debug(
        `Message [${index}] Role: ${item.role}, Content: ${item.content.slice(0, 50)}${item.content.length > 50 ? "..." : ""}`,
      );
    } else if (item.toolCallId) {
      // Log tool call details
      logger.debug(`Tool Call [${index}] Name: ${item.toolName}, Input: ${JSON.stringify(item.inputParams)}`);
    }
  });
  // todo: check limits in current context window allocation

  const fullChatHistory = sortedMessagesAndToolCalls;
  const limitedChatHistory = await limitChatHistory(fullChatHistory, contextAllocation);
  return constructFormattedChatHistory(limitedChatHistory);
}

function truncateText(
  text: string,
  limits: ContextAllocationItem,
): {
  truncatedText: string;
  wasLimit?: string;
} {
  const { maxChars } = limits;

  if (text.length <= maxChars) {
    return { truncatedText: text };
  }

  // For chat history, we might want to keep more recent messages
  // So we'll take more from the end than the beginning
  const endChars = Math.floor(maxChars * 0.7); // 70% from the end
  const startChars = maxChars - endChars;

  const truncated = `${text.slice(0, startChars)}\n...[TRUNCATED]...\n${text.slice(-endChars)}`;
  return {
    truncatedText: truncated,
    wasLimit: `Text was truncated from ${text.length} to ${truncated.length} characters`,
  };
}

async function limitChatHistory(
  fullChatHistory: ConversationEntry[],
  contextLimit: ContextAllocationItem,
): Promise<ConversationEntry[]> {
  const chatHistoryLimit = CONTEXT_ALLOCATION.chatHistory.maxTokens;
  const limitedChatHistory: ConversationEntry[] = fullChatHistory;
  // MOCK
  // todo: implement

  return limitedChatHistory;
}
