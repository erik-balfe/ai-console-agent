import { Anthropic, AnthropicAgent, BaseToolWithCall, Groq, LLM, OpenAI, OpenAIAgent } from "llamaindex";
import { debug, error } from "../utils/logger";

interface GetAiAgentParams {
  modelId: string;
  apiKey: string;
  tools: BaseToolWithCall[];
}

export function getAiAgent({ modelId, apiKey, tools }: GetAiAgentParams) {
  const lowerCaseModelId = modelId.toLowerCase(); // Convert modelId to lowercase
  let client: LLM | null = null;

  if (lowerCaseModelId.startsWith("llama")) {
    client = new Groq({
      model: modelId,
      maxTokens: 4000,
      apiKey,
    });
  }
  if (lowerCaseModelId.startsWith("gpt")) {
    client = new OpenAI({
      model: modelId,
      maxTokens: 4000,
      apiKey,
    });
  }
  if (lowerCaseModelId.startsWith("claude")) {
    client = new Anthropic({
      model: modelId as any,
      maxTokens: 4000,
      apiKey,
    });
  }

  if (lowerCaseModelId.startsWith("qwen")) {
    throw new Error("qwen provider is not implemented yet");

    client = new NebiusClient({
      model: modelId,
      maxTokens: 8192, // Example value
      apiKey,
      baseURL: "https://api.studio.nebius.ai/v1/",
    });
  }

  if (!client) {
    error("Invalid model ID: No client created", lowerCaseModelId);
    throw new Error("Invalid model ID");
  }

  let agent;

  if (modelId.startsWith("llama")) {
    console.log(`Creating OpenAIAgent with LLM: ${modelId}`);
    agent = new OpenAIAgent({
      llm: client,
      tools,
    });
  }
  if (modelId.startsWith("gpt") || modelId.toLowerCase().startsWith("qwen")) {
    console.log(`Creating OpenAIAgent with LLM: ${modelId}`);
    agent = new OpenAIAgent({
      llm: client,
      tools,
    });
  }
  if (modelId.startsWith("claude")) {
    console.log(`Creating AnthropicAgent with LLM: ${modelId}`);
    agent = new AnthropicAgent({
      llm: client,
      tools,
    });
  }

  if (!agent) {
    console.error("Invalid model ID: No agent created");
    throw new Error("Invalid model ID");
  }

  console.log(`Returning agent for model: ${modelId}`);
  return agent;
}
