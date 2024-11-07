import { ConversationMetadata } from "./database";
import { AgentMessage, ToolCall } from "./interface";

export function strigifyFullConversation(
  messages: AgentMessage[],
  toolCalls: ToolCall[],
  conversationMetadata: ConversationMetadata,
): string {
  const messageEntries = messages
    .map((m) => `<message role="${m.role}" timestamp="${m.timestamp}">${m.content}</message>`)
    .join("");
  const toolEntries = toolCalls
    .map(
      (t) =>
        `<toolCall name="${t.name}" timestamp="${t.timestamp}"><input>${t.inputParams}</input><output>${t.output}</output></toolCall>`,
    )
    .join("");

  return `<conversation>${messageEntries}${toolEntries}</conversation>`;
}
