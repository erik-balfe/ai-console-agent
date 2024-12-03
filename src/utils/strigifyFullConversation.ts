import { ConversationMetadata, isAgentMessage, isToolCall } from "./database";
import { dateToReadableFormat } from "./dateToReadableFormat";
import { ConversationEntry } from "./interface";

export function strigifyFullConversation(
  entries: ConversationEntry[],
  conversationMetadata: ConversationMetadata & { userQuery: string },
): string {
  const result: string[] = [];

  // Add the initial query as the first entry
  result.push(
    `<message role="user" time="${dateToReadableFormat(new Date(conversationMetadata.timestamp))}">${conversationMetadata.userQuery}</message>`,
  );

  entries.forEach((entry, index) => {
    if (isAgentMessage(entry)) {
      // Regular message
      result.push(
        `<message role="${entry.role}" time="${dateToReadableFormat(new Date(entry.timestamp))}">${entry.content}</message>`,
      );
    } else if (isToolCall(entry)) {
      // Tool call and result
      result.push(
        `<toolCall name="${entry.toolName}" time="${dateToReadableFormat(new Date(entry.timestamp))}"><input>${JSON.stringify(entry.inputParams)}</input><output>${entry.output}</output></toolCall>`,
      );
    }
  });

  return `<conversation>${result.join("")}</conversation>`;
}
