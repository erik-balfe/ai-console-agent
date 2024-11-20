import { ChatMessage, MetadataMode, VectorStoreIndex } from "llamaindex";
import { addConversationDocument, initializeVectorStoreIndex } from "../ai/retrieval/vectorStore";
import { CONTEXT_ALLOCATION, ContextAllocationItem } from "../constants";
import { ConversationMetadata, Database, getAllConversationData } from "../utils/database";
import { logger } from "../utils/logger";
import { mergeSortedArrays } from "../utils/mergeSortedArrays";
import { strigifyFullConversation } from "../utils/strigifyFullConversation";

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
  // todo: adjust similarityTopK according to quota for memery.
  logger.debug("Starting retrieval process with query:", query);
  try {
    const topK = 2;
    const retriever = vectorStoreIndex.asRetriever({ similarityTopK: topK });
    logger.debug("Initialized retriever with similarityTopK:", topK);

    const nodes = await retriever.retrieve(query);
    logger.debug(`Retrieved ${nodes.length} relevant nodes from the vector store.`);

    if (nodes.length > 0) {
      // logger.debug(`Node details:\n`, JSON.stringify(nodes, null, 2));
    } else {
      logger.debug("No nodes retrieved for the given query.");
    }

    const relevantNodes = nodes.map((node) => node.node.getContent(MetadataMode.ALL));
    logger.debug("memories size:", relevantNodes.length, "items,");

    return relevantNodes;
  } catch (error) {
    logger.error("Error retrieving documents from vector store:", error);
    return [];
  }
}

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

export async function constructChatHistory(db: Database, conversationId: number): Promise<ChatMessage[]> {
  const fullCurrentConversationData = getAllConversationData(db, conversationId);
  const sortedMessagesAndToolCalls = mergeSortedArrays(
    fullCurrentConversationData.messages,
    fullCurrentConversationData.toolCalls,
  );
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
  return constructFormattedChatHistory(sortedMessagesAndToolCalls);
}

export async function getMemories(input: string): Promise<string> {
  const vectorStoreIndex = await initializeVectorStoreIndex();
  logger.debug("Initialized vectorStoreIndex for memory system message.");

  const relevantContext = await getRelevantContext(vectorStoreIndex, input);
  logger.debug(`Relevant context returned: ${relevantContext.length} items.`);

  if (!relevantContext.length) {
    logger.debug("No relevant context found for the current query");
  }

  // Handle memories truncation
  logger.debug("memories items number:", relevantContext.length);
  const memoriesRaw = relevantContext.map((item) => `<memory>${item}</memory>`).join("\n\n");
  const { truncatedText: memoriesTruncated, wasLimit: memoriesLimit } = truncateText(
    memoriesRaw,
    CONTEXT_ALLOCATION.memories,
  );

  if (memoriesLimit) {
    logger.warn(memoriesLimit);
  }

  return memoriesTruncated;
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
