import { OpenAIEmbedding } from "llamaindex";
import { WEAK_MODEL_ID } from "../constants";
import { getOrPromptForAPIKey } from "./getOrPromptForAPIKey";

// const embeddingModelId = ALL_OPENAI_EMBEDDING_MODELS["text-embedding-3-small"];
const embeddingModelId = "text-embedding-3-small";

// it is currently not in use.
// Its supposed to be stored in context of agent run.
// So embedding model may be not hardcoded but configurable by user.

let embeddingModel: OpenAIEmbedding | null = null;

export async function initializeEmbeddingModel(): Promise<void> {
  const apiKey = await getOrPromptForAPIKey(WEAK_MODEL_ID);
  if (!apiKey) {
    throw new Error("OpenAI API key not found. Please set up your API key.");
  }
  embeddingModel = new OpenAIEmbedding({ apiKey, model: embeddingModelId });
  logger.info("Embedding model initialized successfully");
}
