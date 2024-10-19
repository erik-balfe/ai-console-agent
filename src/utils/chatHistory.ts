import { Database, insertConversation, insertMessage, updateConversationTotalTime } from "./database";
import { logger } from "./logger";
import {
  addConversation as addConversationToVectorStore,
  getRelevantContext as getRelevantContextFromVectorStore,
} from "./vectorStore";

export const MessageRoles = {
  USER: "user",
  AGENT: "agent",
  SYSTEM: "system",
} as const;

export type MessageRole = (typeof MessageRoles)[keyof typeof MessageRoles];

export async function addConversation(
  db: Database,
  conversation: { query: string; response: string; totalTime: number },
): Promise<void> {
  try {
    const conversationId = await insertConversation(db, conversation.query);
    await insertMessage(db, conversationId, conversation.query, MessageRoles.USER);
    await insertMessage(db, conversationId, conversation.response, MessageRoles.AGENT);
    await updateConversationTotalTime(db, conversationId, conversation.totalTime);

    await addConversationToVectorStore(db, conversation);
  } catch (error) {
    logger.error("Error adding conversation:", error);
    throw error;
  }
}

export async function getRelevantContext(query: string): Promise<string[]> {
  try {
    return await getRelevantContextFromVectorStore(query);
  } catch (error) {
    logger.error("Error retrieving relevant context:", error);
    return [];
  }
}
