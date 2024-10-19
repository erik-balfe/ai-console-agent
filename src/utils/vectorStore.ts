import { Document, VectorStoreIndex, storageContextFromDefaults } from "llamaindex";
import path from "path";
import { CONFIG_DIR_PATH } from "../constants";
import { logger } from "./logger";

const VECTOR_STORE_PATH = path.join(CONFIG_DIR_PATH, "vector_store");

export async function createOrUpdateIndex(documents: Document[]): Promise<VectorStoreIndex> {
  try {
    const storageContext = await storageContextFromDefaults({
      persistDir: VECTOR_STORE_PATH,
    });

    let index: VectorStoreIndex;

    // Check if the index exists by attempting to load it
    try {
      logger.info("Attempting to load existing index");
      index = await VectorStoreIndex.init({ storageContext });
      // If successful, insert new documents
      for (const doc of documents) {
        await index.insert(doc);
      }
    } catch (error) {
      logger.info("Existing index not found. Creating new index");
      index = await VectorStoreIndex.fromDocuments(documents, { storageContext });
    }

    // Persist the index
    await storageContext.persist();
    return index;
  } catch (error) {
    logger.error("Error creating or updating index:", error);
    throw error;
  }
}

export function createQueryEngine(index: VectorStoreIndex) {
  return index.asQueryEngine({ similarityTopK: 5 });
}
