import { Document, MetadataMode, VectorStoreIndex, storageContextFromDefaults } from "llamaindex";
import path from "path";
import { CONFIG_DIR_PATH } from "../constants";
import { logger } from "./logger";

const VECTOR_STORE_PATH = path.join(CONFIG_DIR_PATH, "vector_store");
const SIMILARITY_TOP_K = 5;

export async function createOrUpdateIndex(documents: Document[]): Promise<VectorStoreIndex> {
  try {
    logger.debug(`Creating/updating index with ${documents.length} documents`);
    const storageContext = await storageContextFromDefaults({
      persistDir: VECTOR_STORE_PATH,
    });

    let index: VectorStoreIndex;
    try {
      logger.info("Attempting to load existing index");
      index = await VectorStoreIndex.init({ storageContext });
      logger.info("Existing index loaded successfully");
      // If successful, insert new documents
      for (const doc of documents) {
        logger.debug(`Inserting document: ${doc.id_}`);
        await index.insert(doc);
      }
    } catch (error) {
      logger.info("Existing index not found. Creating new index");
      index = await VectorStoreIndex.fromDocuments(documents, { storageContext });
      logger.info("New index created successfully");
    }

    // Persist the index
    // Currently disabled to test if it is persisted automatically
    // logger.debug("Persisting index");
    // await index.storage_context.persist(VECTOR_STORE_PATH);
    logger.info("Index persisted successfully");
    return index;
  } catch (error) {
    logger.error("Error creating or updating index:", error);
    throw error;
  }
}

export async function retrieveRelevantNodes(index: VectorStoreIndex, query: string): Promise<string> {
  logger.debug(`Retrieving relevant nodes for query: ${query}`);
  const retriever = index.asRetriever({ similarityTopK: SIMILARITY_TOP_K });
  const nodesWithScore = await retriever.retrieve(query);
  logger.debug("Retrieved nodes with scores:", JSON.stringify(nodesWithScore, null, 2));

  const relevantInfo = nodesWithScore
    .map((nodeWithScore) => nodeWithScore.node.getContent(MetadataMode.NONE))
    .join("\n\n");
  logger.debug("Relevant information:", relevantInfo);
  return relevantInfo;
}

export function createQueryEngine(index: VectorStoreIndex) {
  logger.debug("Creating query engine");
  return index.asQueryEngine({ similarityTopK: SIMILARITY_TOP_K });
}
