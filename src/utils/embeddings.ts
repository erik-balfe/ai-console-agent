import { Document, OpenAIEmbedding } from "llamaindex";
import { getAPIKey } from "./apiKeyManager";
import { logger } from "./logger";

// const embeddingModelId = ALL_OPENAI_EMBEDDING_MODELS["text-embedding-3-small"];
const embeddingModelId = "text-embedding-3-small";

let embeddingModel: OpenAIEmbedding | null = null;

export async function initializeEmbeddingModel(): Promise<void> {
  const apiKey = getAPIKey();
  if (!apiKey) {
    throw new Error("OpenAI API key not found. Please set up your API key.");
  }
  embeddingModel = new OpenAIEmbedding({ apiKey, model: embeddingModelId });
  logger.info("Embedding model initialized successfully");
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!embeddingModel) {
    await initializeEmbeddingModel();
  }

  try {
    const document = new Document({ text });
    const embedding = await embeddingModel!.getTextEmbedding(text);
    return embedding;
  } catch (error) {
    logger.error("Error generating embedding:", error);
    throw error;
  }
}
