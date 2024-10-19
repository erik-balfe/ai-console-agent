import { VectorStoreIndex } from "llamaindex";
import { createDocumentFromConversation, Database, insertConversation, insertMessage } from "./database";
import { logger } from "./logger";
import { createOrUpdateIndex, retrieveRelevantNodes } from "./vectorStore";

let vectorStoreIndex: VectorStoreIndex | null = null;

export async function addConversation(
  db: Database,
  conversation: { query: string; response: string; totalTime: number },
): Promise<void> {
  try {
    const conversationId = await insertConversation(db, conversation.query);
    await insertMessage(db, conversationId, conversation.query, true);
    await insertMessage(db, conversationId, conversation.response, false);

    const document = await createDocumentFromConversation(db, conversationId);
    vectorStoreIndex = await createOrUpdateIndex([document]);
  } catch (error) {
    logger.error("Error adding conversation:", error);
    throw error;
  }
}

export async function getRelevantContext(query: string): Promise<string[]> {
  if (!vectorStoreIndex) {
    logger.warn("Vector store index not initialized");
    return [];
  }

  try {
    const relevantInfo = await retrieveRelevantNodes(vectorStoreIndex, query);
    return relevantInfo.split("\n\n");
  } catch (error) {
    logger.error("Error retrieving relevant context:", error);
    return [];
  }
}
