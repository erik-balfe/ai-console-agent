import { MODELS } from "../constants";

export function getContextAllocation(model: string) {
  const modelConfig = MODELS[model];
  if (!modelConfig) {
    throw new Error(`Model ${model} not found in MODELS`);
  }

  const totalTokens = modelConfig.maxContextSize;

  const contextAllocation = {
    memories: {
      maxTokens: Math.floor(0.15 * totalTokens),
      assumedTokenSize: 4,
      maxChars: Math.floor(0.15 * totalTokens * 4),
    },
    chatHistory: {
      maxTokens: Math.floor(0.3 * totalTokens),
      assumedTokenSize: 4,
      maxChars: Math.floor(0.3 * totalTokens * 4),
    },
    toolOutput: {
      maxTokens: Math.floor(0.1 * totalTokens),
      assumedTokenSize: 4,
      maxChars: Math.floor(0.1 * totalTokens),
    },
    systemMessage: {
      staticPart: {
        maxTokens: 2000,
        assumedTokenSize: 4,
        maxChars: 8000,
      },
      dynamicPart: {
        maxTokens: 500,
        assumedTokenSize: 4,
        maxChars: 1000,
      },
    },
  };

  return contextAllocation;
}
