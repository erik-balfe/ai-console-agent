import { MODELS } from "../constants";
import { logger } from "./logger";

export interface UsageCostResult {
  costUSD: number;
  details: {
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
    inputCost: number;
    cachedInputCost: number;
    outputCost: number;
    totalCost: number;
  };
}

export function countUsageCost(usage: Record<string, unknown>, model: string): UsageCostResult {
  const modelConfig = MODELS[model] ?? MODELS["gpt-4o-mini"];

  logger.debug("ugase from llamaindex:", JSON.stringify(usage));
  const inputTokens = usage.input_tokens || usage.prompt_tokens || 0;
  const outputTokens = usage.output_tokens || usage.completion_tokens || 0;
  const cachedTokens = usage.prompt_tokens_details?.cached_tokens || 0;

  console.log(`Model: ${model}`);
  console.log(`Input Tokens: ${inputTokens}`);
  console.log(`Cached Tokens: ${cachedTokens}`);
  console.log(`Output Tokens: ${outputTokens}`);

  const inputCost = inputTokens * modelConfig.price.input;
  const cachedInputCost = cachedTokens * (modelConfig.price.inputCacheHit ?? modelConfig.price.input);
  const outputCost = outputTokens * modelConfig.price.output;
  const totalCost = inputCost - cachedInputCost + outputCost;

  logger.debug(`Input Cost: ${inputCost.toFixed(6)} USD`);
  logger.debug(`Cached Input Cost: ${cachedInputCost.toFixed(6)} USD`);
  logger.debug(`Output Cost: ${outputCost.toFixed(6)} USD`);
  logger.debug(`Total Cost: ${totalCost.toFixed(6)} USD`);

  return {
    costUSD: totalCost,
    details: {
      inputTokens,
      outputTokens,
      cachedTokens,
      inputCost,
      cachedInputCost,
      outputCost,
      totalCost,
    },
  };
}
