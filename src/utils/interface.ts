import { AVAILABLE_MODELS } from "../constants";

export interface AgentMessage {
  id: number;
  conversationId: number;
  stepNumber: number;
  content: string;
  timestamp: number;
  duration: number;
  role: string;
}

export interface ToolCall {
  id: number;
  toolCallId: string;
  toolName: string;
  inputParams: any;
  output: string;
  timestamp: number;
  duration: number;
  conversationId: number;
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

export type ConversationEntry = AgentMessage | ToolCall;
