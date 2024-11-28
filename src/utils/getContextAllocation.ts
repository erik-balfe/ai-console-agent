import { MODELS } from "../constants";
import { AppConfig } from "./config";
import { debug } from "./logger";

export function getContextAllocation(appConfig: AppConfig) {
  const modelId = appConfig.model;
  const contextWindowLimit = appConfig.contextWindowLimit;
  const modelConfig = MODELS[modelId];

  if (!modelConfig) {
    throw new Error(`Model ${modelId} not found in MODELS`);
  }

  debug("Context Allocation Input Parameters:", {
    modelId,
    contextWindowLimit: contextWindowLimit || "Not specified",
    modelMaxContextSize: modelConfig.maxContextSize,
  });

  // Determine the effective total tokens
  const modelMaxTokens = modelConfig.maxContextSize;
  const effectiveTokens = contextWindowLimit ? Math.min(contextWindowLimit, modelMaxTokens) : modelMaxTokens;

  debug("Effective Token Calculation:", {
    modelMaxTokens,
    requestedLimit: contextWindowLimit,
    effectiveTokens,
    limitApplied: contextWindowLimit ? "Yes" : "No",
  });

  // Calculate token allocations
  const memoryTokens = Math.floor(0.15 * effectiveTokens);
  const chatHistoryTokens = Math.floor(0.3 * effectiveTokens);
  const toolOutputTokens = Math.floor(0.1 * effectiveTokens);
  const staticSystemTokens = Math.min(2000, Math.floor(0.1 * effectiveTokens));
  const dynamicSystemTokens = Math.min(500, Math.floor(0.05 * effectiveTokens));

  debug("Token Distribution:", {
    memories: `${memoryTokens} (15%)`,
    chatHistory: `${chatHistoryTokens} (30%)`,
    toolOutput: `${toolOutputTokens} (10%)`,
    staticSystemMessage: `${staticSystemTokens} (10% capped at 2000)`,
    dynamicSystemMessage: `${dynamicSystemTokens} (5% capped at 500)`,
    total: memoryTokens + chatHistoryTokens + toolOutputTokens + staticSystemTokens + dynamicSystemTokens,
  });

  const contextAllocation = {
    memories: {
      maxTokens: memoryTokens,
      assumedTokenSize: 4,
      maxChars: memoryTokens * 4,
    },
    chatHistory: {
      maxTokens: chatHistoryTokens,
      assumedTokenSize: 4,
      maxChars: chatHistoryTokens * 4,
    },
    toolOutput: {
      maxTokens: toolOutputTokens,
      assumedTokenSize: 4,
      maxChars: toolOutputTokens * 4,
    },
    systemMessage: {
      staticPart: {
        maxTokens: staticSystemTokens,
        assumedTokenSize: 4,
        maxChars: staticSystemTokens * 4,
      },
      dynamicPart: {
        maxTokens: dynamicSystemTokens,
        assumedTokenSize: 4,
        maxChars: dynamicSystemTokens * 4,
      },
    },
  };

  debug("Final Context Allocation:", {
    memories: {
      tokens: contextAllocation.memories.maxTokens,
      chars: contextAllocation.memories.maxChars,
    },
    chatHistory: {
      tokens: contextAllocation.chatHistory.maxTokens,
      chars: contextAllocation.chatHistory.maxChars,
    },
    toolOutput: {
      tokens: contextAllocation.toolOutput.maxTokens,
      chars: contextAllocation.toolOutput.maxChars,
    },
    systemMessage: {
      staticPart: {
        tokens: contextAllocation.systemMessage.staticPart.maxTokens,
        chars: contextAllocation.systemMessage.staticPart.maxChars,
      },
      dynamicPart: {
        tokens: contextAllocation.systemMessage.dynamicPart.maxTokens,
        chars: contextAllocation.systemMessage.dynamicPart.maxChars,
      },
    },
  });

  return contextAllocation;
}
