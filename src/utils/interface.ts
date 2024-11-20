import { AVAILABLE_MODELS } from "../constants";

export interface AgentMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  duration?: number;
}

export interface ToolCall {
  toolName: string;
  inputParams: string;
  toolCallId: string;
  output: string;
  timestamp: number;
  executionTime: number;
}

export type ModelShortName = keyof typeof AVAILABLE_MODELS;
export type ModelId = (typeof AVAILABLE_MODELS)[ModelShortName];
export type ValidModel = ModelId | ModelShortName;

export interface UsageCostResult {
  costUSD: number;
  details: {
    inputTokens: number;
    outputTokens: number;
    inputCost: number;
    outputCost: number;
    totalCost: number;
  };
}
