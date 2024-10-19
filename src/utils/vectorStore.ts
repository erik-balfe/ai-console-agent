import { MetadataMode, storageContextFromDefaults, VectorStoreIndex } from "llamaindex";
import path from "path";
import { CONFIG_DIR_PATH } from "../constants";
import { createDocumentFromConversation, Database, insertConversation } from "./database";
import { logger } from "./logger";

const VECTOR_STORE_PATH = path.join(CONFIG_DIR_PATH, "vector_store");

let vectorStoreIndex: VectorStoreIndex | null = null;

async function initializeVectorStoreIndex(): Promise<VectorStoreIndex> {
  try {
    const storageContext = await storageContextFromDefaults({ persistDir: VECTOR_STORE_PATH });
    let index: VectorStoreIndex;

    try {
      logger.info("Attempting to load existing index");
      index = await VectorStoreIndex.init({ storageContext });
      logger.info("Existing index loaded successfully");
    } catch (error) {
      logger.info("Existing index not found. Creating new index");
      index = await VectorStoreIndex.fromDocuments([], { storageContext });
      logger.info("New index created successfully");
    }

    return index;
  } catch (error) {
    logger.error("Error initializing vector store index:", error);
    throw error;
  }
}

export async function addConversation(
  db: Database,
  conversation: { query: string; response: string; totalTime: number },
): Promise<void> {
  try {
    const conversationId = await insertConversation(db, conversation.query);
    const document = await createDocumentFromConversation(db, conversationId);

    if (!vectorStoreIndex) {
      vectorStoreIndex = await initializeVectorStoreIndex();
    }

    await vectorStoreIndex.insert(document);
    // The index is automatically persisted due to the storageContext
    logger.info("Vector store index updated and persisted");
  } catch (error) {
    logger.error("Error adding conversation:", error);
    throw error;
  }
}

export async function getRelevantContext(query: string): Promise<string[]> {
  if (!vectorStoreIndex) {
    vectorStoreIndex = await initializeVectorStoreIndex();
  }

  try {
    const retriever = vectorStoreIndex.asRetriever({ similarityTopK: 5 });
    const nodes = await retriever.retrieve(query);
    logger.debug(`Retrieved ${nodes.length} relevant nodes`);
    return nodes.map((node) => node.node.getContent(MetadataMode.NONE));
  } catch (error) {
    logger.error("Error retrieving relevant context:", error);
    return [];
  }
}
