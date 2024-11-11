import { ConversationMetadata } from "./database";
import { dateToReadableFormat } from "./dateToReadableFormat";
import { AgentMessage, ToolCall } from "./interface";

export function strigifyFullConversation(
  messages: AgentMessage[],
  toolCalls: ToolCall[],
  conversationMetadata: ConversationMetadata & { userQuery: string },
): string {
  const result: string[] = [];

  // Add the initial query as the first entry
  result.push(
    `<message role="user" time="${dateToReadableFormat(new Date(conversationMetadata.timestamp))}">${conversationMetadata.userQuery}</message>`,
  );

  let messageIndex = 0;
  let toolIndex = 0;

  while (messageIndex < messages.length && toolIndex < toolCalls.length) {
    if (messages[messageIndex].timestamp <= toolCalls[toolIndex].timestamp) {
      const message = messages[messageIndex];
      result.push(
        `<message role="${message.role}" time="${dateToReadableFormat(new Date(message.timestamp))}">${message.content}</message>`,
      );
      messageIndex++;
    } else {
      const tool = toolCalls[toolIndex];
      result.push(
        `<toolCall name="${tool.name}" time="${dateToReadableFormat(new Date(tool.timestamp))}"><input>${tool.inputParams}</input><output>${tool.output}</output></toolCall>`,
      );
      toolIndex++;
    }
  }

  // Add remaining messages
  while (messageIndex < messages.length) {
    const message = messages[messageIndex];
    result.push(
      `<message role="${message.role}" time="${dateToReadableFormat(new Date(message.timestamp))}">${message.content}</message>`,
    );
    messageIndex++;
  }

  // Add remaining tool calls
  while (toolIndex < toolCalls.length) {
    const tool = toolCalls[toolIndex];
    result.push(
      `<toolCall name="${tool.name}" time="${dateToReadableFormat(new Date(tool.timestamp))}"><input>${tool.inputParams}</input><output>${tool.output}</output></toolCall>`,
    );
    toolIndex++;
  }

  return `<conversation>${result.join("")}</conversation>`;
}
