import { AgentMessage, ToolCall } from "./interface";

export type ConversationEntry = AgentMessage | (ToolCall & { type: "toolCall" });

export function mergeSortedArrays(messages: AgentMessage[], toolCalls: ToolCall[]): ConversationEntry[] {
  const result: ConversationEntry[] = [];
  let messageIndex = 0;
  let toolIndex = 0;

  while (messageIndex < messages.length && toolIndex < toolCalls.length) {
    if (messages[messageIndex].timestamp <= toolCalls[toolIndex].timestamp) {
      const message = messages[messageIndex];
      result.push(message);
      messageIndex++;
    } else {
      const tool = toolCalls[toolIndex];
      result.push({
        ...tool,
        type: "toolCall" as const,
      });
      toolIndex++;
    }
  }

  // Add remaining messages
  while (messageIndex < messages.length) {
    const message = messages[messageIndex];
    result.push(message);
    messageIndex++;
  }

  // Add remaining tool calls
  while (toolIndex < toolCalls.length) {
    const tool = toolCalls[toolIndex];
    result.push({
      ...tool,
      type: "toolCall" as const,
    });
    toolIndex++;
  }

  return result;
}
