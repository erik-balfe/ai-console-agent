import {
  Document,
  MetadataMode,
  OpenAI,
  OpenAIEmbedding,
  serviceContextFromDefaults,
  storageContextFromDefaults,
  VectorStoreIndex,
} from "llamaindex";
import { EMBEDDINGS_MODEL_ID, VECTOR_STORE_PATH, WEAK_MODEL_ID } from "../../constants";
import { getOrPromptForAPIKey } from "../../utils/getOrPromptForAPIKey";
import { logger } from "../../utils/logger";

let vectorStoreIndex: VectorStoreIndex | null = null;

export async function initializeVectorStoreIndex(): Promise<VectorStoreIndex> {
  const storageContext = await storageContextFromDefaults({ persistDir: VECTOR_STORE_PATH });

  const embeddingProviderApiKey = await getOrPromptForAPIKey(EMBEDDINGS_MODEL_ID);
  const weakModelApiKey = await getOrPromptForAPIKey(WEAK_MODEL_ID);
  let index: VectorStoreIndex;

  try {
    logger.debug("Attempting to load existing index");
    index = await VectorStoreIndex.init({
      storageContext,
      serviceContext: serviceContextFromDefaults({
        embedModel: new OpenAIEmbedding({ apiKey: embeddingProviderApiKey, model: EMBEDDINGS_MODEL_ID }),
        llm: new OpenAI({ apiKey: weakModelApiKey, model: WEAK_MODEL_ID }),
      }),
    });
    logger.debug("Existing index loaded successfully");
  } catch (error) {
    logger.debug("Existing index not found. Creating new index");
    index = await VectorStoreIndex.fromDocuments([], { storageContext });
    logger.info("New index created successfully");
  }

  return index;
}

export async function insertDocument(document: Document): Promise<void> {
  if (!vectorStoreIndex) {
    vectorStoreIndex = await initializeVectorStoreIndex();
  }
  await vectorStoreIndex.insert(document);
  logger.info("Document inserted into vector store.");
}

export async function retrieveDocuments(query: string): Promise<string[]> {
  if (!vectorStoreIndex) {
    vectorStoreIndex = await initializeVectorStoreIndex();
  }

  try {
    const retriever = vectorStoreIndex.asRetriever({ similarityTopK: 5 });
    const nodes = await retriever.retrieve(query);
    logger.debug(`Retrieved ${nodes.length} relevant nodes.`);
    return nodes.map((node) => node.node.getContent(MetadataMode.NONE));
  } catch (error) {
    logger.error("Error retrieving documents from vector store:", error);
    return [];
  }
}

export async function addConversationDocument(
  conversationId: number,
  formattedText: string,
  metadata: object,
): Promise<void> {
  const document = new Document({
    text: formattedText,
    id_: conversationId.toString(),
    metadata: metadata,
  });

  await insertDocument(document);
  logger.info(`Conversation document for ID: ${conversationId} added to vector store.`);
}
