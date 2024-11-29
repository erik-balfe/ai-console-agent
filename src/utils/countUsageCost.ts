import { MODELS } from "../constants";
import { debug } from "./logger/Logger";

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

  debug("ugase from llamaindex:", JSON.stringify(usage));
  const inputTokens = usage.input_tokens || usage.prompt_tokens || 0;
  const outputTokens = usage.output_tokens || usage.completion_tokens || 0;
  const cachedTokens = usage.prompt_tokens_details?.cached_tokens || 0;

  debug(`Model: ${model}`);
  debug(`Input Tokens: ${inputTokens}`);
  debug(`Cached Tokens: ${cachedTokens}`);
  debug(`Output Tokens: ${outputTokens}`);

  const inputCost = inputTokens * modelConfig.price.input;
  const cachedInputCost = cachedTokens * (modelConfig.price.inputCacheHit ?? modelConfig.price.input);
  const outputCost = outputTokens * modelConfig.price.output;
  const totalCost = inputCost - cachedInputCost + outputCost;

  debug(`Input Cost: ${inputCost.toFixed(6)} USD`);
  debug(`Cached Input Cost: ${cachedInputCost.toFixed(6)} USD`);
  debug(`Output Cost: ${outputCost.toFixed(6)} USD`);
  debug(`Total Cost: ${totalCost.toFixed(6)} USD`);

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
