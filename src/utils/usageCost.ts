import { MODEL_PRICES } from "../constants";

interface UsageCostResult {
  costUSD: number;
  details: {
    inputTokens: number;
    outputTokens: number;
    inputCost: number;
    outputCost: number;
    totalCost: number;
  };
}

/**
 * Calculates the cost of LLM usage based on token counts and model pricing
 *
 * @param usage - Token usage information from the LLM response
 * @param modelId - ID of the model used for the request
 * @returns Cost information including total USD cost and detailed breakdown
 */
export function countUsageCost(
  usage: {
    input_tokens?: number;
    output_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
  },
  modelId: string,
): UsageCostResult {
  const modelConfig = MODEL_PRICES[modelId];
  if (!modelConfig) {
    throw new Error(`Unknown model ID: ${modelId}`);
  }

  // Normalize token counts from different possible field names
  const inputTokens = usage.input_tokens || usage.prompt_tokens || 0;
  const outputTokens = usage.output_tokens || usage.completion_tokens || 0;

  // Calculate costs
  const inputCost = inputTokens * modelConfig.price.input;
  const outputCost = outputTokens * modelConfig.price.output;
  const totalCost = inputCost + outputCost;

  return {
    costUSD: totalCost,
    details: {
      inputTokens,
      outputTokens,
      inputCost,
      outputCost,
      totalCost,
    },
  };
}
