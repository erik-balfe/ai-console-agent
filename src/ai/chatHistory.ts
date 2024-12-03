import { ChatMessage } from "llamaindex";
import { CONTEXT_ALLOCATION, ContextAllocationItem } from "../constants";
import { ConversationMetadata, Database, getAllConversationData } from "../utils/database";
import { ConversationEntry } from "../utils/interface";
import { debug } from "../utils/logger/Logger";


function constructFormattedChatHistory(sortedMessagesAndToolCalls: ConversationEntry[]): ChatMessage[] {
  const chatHistory: ChatMessage[] = [];

  sortedMessagesAndToolCalls.forEach((current, index) => {
    if ("role" in current) {
      // Regular message
      chatHistory.push({
        role: current.role,
        content: current.content || "",
      });
      if (!current.content) {
        debug("json of current that is message but without content:", JSON.stringify(current));
      }
      debug(`Message [${index}] Role: ${current.role}, Content: ${current?.content?.slice(0, 50)}...`);
    } else if ("toolName" in current && "output" in current) {
      // Tool call and result
      debug(
        `Tool Call [${index}] ID: ${current.toolCallId}, Name: ${current.toolName}, Input: ${JSON.stringify(current.inputParams)}`,
      );
      debug(`Tool Result [${index}] ID: ${current.toolCallId}, Output: ${current.output}`);

      // Format tool call as a message
      const toolCallMessage: ChatMessage = {
        role: "assistant",
        content: `**Tool Call**: ${current.toolName}\n**Input**: ${JSON.stringify(current.inputParams)}`,
        options: {
          toolCall: { id: current.toolCallId, name: current.toolName, input: current.inputParams },
        },
      };
      chatHistory.push(toolCallMessage);

      // Format tool result as a message
      const toolResultMessage: ChatMessage = {
        role: "assistant",
        content: `**Tool Result**: ${current.output}`,
        options: {
          toolResult: { id: current.toolCallId, result: current.output, isError: false },
        },
      };
      chatHistory.push(toolResultMessage);
    }
  });

  debug("formatted chat history with messages and tool calls");
  debug(chatHistory);

  return chatHistory;
}

export async function constructChatHistory(
  db: Database,
  conversationId: number,
  contextAllocation: ContextAllocationItem,
  newConversation: boolean, //
): Promise<ChatMessage[]> {
  let lastConversationsData: { entries: ConversationEntry[]; conversationData: ConversationMetadata };

  lastConversationsData = getAllConversationData(db, conversationId);

  const sortedMessagesAndToolCalls = lastConversationsData.entries;
  // const { conversations } = lastConversationsData;
  debug("sortedMessagesAndToolCalls:", sortedMessagesAndToolCalls.length);

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
