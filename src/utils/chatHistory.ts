import { ChatMessage, MetadataMode, VectorStoreIndex } from "llamaindex";
import { addConversationDocument, initializeVectorStoreIndex } from "../ai/retrieval/vectorStore";
import { MEMORY_DESCRIPTION } from "../constants";
import { ConversationMetadata, Database, getAllConversationData } from "./database";
import { logger } from "./logger";
import { strigifyFullConversation } from "./strigifyFullConversation";

export async function saveConversationDocument(db: Database, conversationId: number): Promise<void> {
  const document = await createDocumentFromConversation(db, conversationId);
  await addConversationDocument(conversationId, document.text, document.metadata);
}

async function createDocumentFromConversation(
  db: Database,
  conversationId: number,
): Promise<{ text: string; metadata: ConversationMetadata }> {
  const { messages, toolCalls, conversationData } = getAllConversationData(db, conversationId);
  const stringifiedConversation = strigifyFullConversation(messages, toolCalls, conversationData);

  logger.debug("all conversation messages:\n\n", JSON.stringify(messages, null, 2));
  logger.debug("all conversation tool Calls:\n\n", JSON.stringify(toolCalls, null, 2));
  logger.debug("all conversation Data:\n\n", JSON.stringify(conversationData, null, 2));

  const metadata = {
    conversationId,
    userFeedback: conversationData.userFeedback ?? 1,
    correctness: conversationData.correctness ?? 1,
    faithfulness: conversationData.faithfulness ?? 1,
    relevancy: conversationData.relevancy ?? 1,
    retrievalCount: conversationData.retrievalCount ?? 0,
    lastRetrieved: conversationData.lastRetrieved,
    title: conversationData,
    timestamp: conversationData.timestamp,
  };

  return { text: stringifiedConversation, metadata };
}

// need to be extended very much. To consider metadata, scores, actuality, relevance, context size etc
//
/**
*
* @param vectorStoreIndex

* @param query
* @returns a list of recalled pieces of information from the vector store with some metadata (like info about the piece to understand what it is). Might be comeplete documents (complete conversation) or just parts of it if the conversation is too long.
/**
*
* @param vectorStoreIndex
* @param query
* @returns a list of recalled pieces of information from the vector store with some metadata (like info about the piece to understand what it is). Might be complete documents (complete conversation) or just parts of it if the conversation is too long.
*/
export async function getRelevantContext(
  vectorStoreIndex: VectorStoreIndex,
  query: string,
): Promise<string[]> {
  // todo: increase 'retrievalCount' and 'lastRetrieved' on each item that is passed to the agent
  logger.debug("Starting retrieval process with query:", query);
  try {
    const retriever = vectorStoreIndex.asRetriever({ similarityTopK: 5 });
    logger.debug("Initialized retriever with similarityTopK:", 5);

    const nodes = await retriever.retrieve(query);
    logger.debug(`Retrieved ${nodes.length} relevant nodes from the vector store.`);

    if (nodes.length > 0) {
      logger.debug(`Node details:\n`, JSON.stringify(nodes, null, 2));
    } else {
      logger.debug("No nodes retrieved for the given query.");
    }

    const relevantNodes = nodes.map((node) => node.node.getContent(MetadataMode.ALL));
    logger.debug(`Retrieved nodes with content snippet: ${JSON.stringify(relevantNodes)}`);

    return relevantNodes;
  } catch (error) {
    logger.error("Error retrieving documents from vector store:", error);
    return [];
  }
}

export async function buildMemorySystemMessage(input: string): Promise<ChatMessage | null> {
  logger.debug("Building memory system message with input:", input);
  const vectorStoreIndex = await initializeVectorStoreIndex();
  logger.debug("Initialized vectorStoreIndex for memory system message.");

  const relevantContext = await getRelevantContext(vectorStoreIndex, input);
  logger.debug(`Relevant context returned: ${relevantContext.length} items.`);

  if (!relevantContext.length) {
    logger.debug("No relevant context found for the current query");
    return null;
  }

  const memoryItems = relevantContext.map((item) => `<memory>${item}</memory>`).join("\n\n");
  logger.debug("Constructed memory items for system message.");

  const memorySystemMessage: ChatMessage = {
    role: "system",
    content: `${MEMORY_DESCRIPTION}:\n` + memoryItems,
  };
  logger.debug("Final memory system message constructed:", memorySystemMessage);

  return memorySystemMessage;
}
