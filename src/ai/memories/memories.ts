import { MetadataMode, VectorStoreIndex } from "llamaindex";
import { ConversationMetadata, Database, getAllConversationData } from "../../utils/database";
import { debug } from "../../utils/logger/Logger";
import { strigifyFullConversation } from "../../utils/strigifyFullConversation";
import { addConversationDocument, initializeVectorStoreIndex } from "./vectorStore";

export async function saveConversationDocument(db: Database, conversationId: number): Promise<void> {
  const document = await createDocumentFromConversation(db, conversationId);
  await addConversationDocument(conversationId, document.text, document.metadata);
}

async function createDocumentFromConversation(
  db: Database,
  conversationId: number,
): Promise<{ text: string; metadata: ConversationMetadata }> {
  const { entries, conversationData } = getAllConversationData(db, conversationId);
  const stringifiedConversation = strigifyFullConversation(entries, conversationData);

  debug("all conversation entries:\n\n", JSON.stringify(entries, null, 2));
  debug("all conversation Data:\n\n", JSON.stringify(conversationData, null, 2));

  const metadata: ConversationMetadata = {
    conversationId,
    userFeedback: conversationData.userFeedback ?? 1,
    correctness: conversationData.correctness ?? 1,
    faithfulness: conversationData.faithfulness ?? 1,
    relevancy: conversationData.relevancy ?? 1,
    retrievalCount: conversationData.retrievalCount ?? 0,
    lastRetrieved: conversationData.lastRetrieved,
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
  // todo: adjust similarityTopK according to quota for memery.
  debug("Starting retrieval process with query:", query);
  try {
    const topK = 2;
    const retriever = vectorStoreIndex.asRetriever({ similarityTopK: topK });
    debug("Initialized retriever with similarityTopK:", topK);

    const nodes = await retriever.retrieve(query);
    debug(`Retrieved ${nodes.length} relevant nodes from the vector store.`);

    if (nodes.length > 0) {
      // debug(`Node details:\n`, JSON.stringify(nodes, null, 2));
    } else {
      debug("No nodes retrieved for the given query.");
    }

    const relevantNodes = nodes.map((node) => node.node.getContent(MetadataMode.ALL));
    debug("memories size:", relevantNodes.length, "items,");

    return relevantNodes;
  } catch (err) {
    console.error("Error retrieving documents from vector store:", err);
    return [];
  }
}

export async function getMemories(input: string): Promise<string> {
  const vectorStoreIndex = await initializeVectorStoreIndex();
  debug("Initialized vectorStoreIndex for memory system message.");

  const relevantContext = await getRelevantContext(vectorStoreIndex, input);
  debug(`Relevant context returned: ${relevantContext.length} items.`);

  if (!relevantContext.length) {
    debug("No relevant context found for the current query");
  }

  // todo: implement
  return "";
}
