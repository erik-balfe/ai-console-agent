import { Anthropic, BaseToolWithCall, Groq, LLM, OpenAI, OpenAIAgent } from "llamaindex";

interface GetAiAgentParams {
  modelId: string;
  apiKey: string;
  tools: BaseToolWithCall[];
}

export function getAiAgent({ modelId, apiKey, tools }: GetAiAgentParams) {
  let client: LLM | null = null;

  if (modelId.startsWith("llama")) {
    client = new Groq({
      model: modelId,
      maxTokens: 4000,
      apiKey,
    });
  }
  if (modelId.startsWith("gpt")) {
    client = new OpenAI({
      model: modelId,
      maxTokens: 4000,
      apiKey,
    });
  }
  if (modelId.startsWith("claude")) {
    client = new Anthropic({
      model: modelId as any,
      maxTokens: 4000,
      apiKey,
    });
  }
  if (!client) throw new Error("Invalid model ID");

  let agent;

  if (modelId.startsWith("llama")) {
    agent = new OpenAIAgent({
      llm: client,
      tools,
    });
  }
  if (modelId.startsWith("gpt")) {
    agent = new OpenAIAgent({
      llm: client,
      tools,
    });
  }
  if (modelId.startsWith("claude")) {
    agent = new OpenAIAgent({
      llm: client,
      tools,
    });
  }

  if (!agent) throw new Error("Invalid model ID");

  return agent;
}
