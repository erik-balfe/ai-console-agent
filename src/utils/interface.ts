export interface AgentMessage {
  role: "user" | "agent" | "system";
  content: string;
  timestamp: number;
  duration?: number;
}

export interface ToolCall {
  name: string;
  inputParams: string;
  output: string;
  timestamp: number;
  executionTime: number;
}
