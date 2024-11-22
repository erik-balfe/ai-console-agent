import { AgentMessage, ConversationEntry, ToolCall } from "./interface";

// export function mergeSortedArrays(messages: AgentMessage[], toolCalls: ToolCall[]): ConversationEntry[] {
//   const result: ConversationEntry[] = [];
//   let messageIndex = 0;
//   let toolIndex = 0;

//   while (messageIndex < messages.length && toolIndex < toolCalls.length) {
//     if (messages[messageIndex].timestamp <= toolCalls[toolIndex].timestamp) {
//       const message = messages[messageIndex];

//       // Check for consecutive same-role messages
//       let concatenatedContent = message.content;
//       let nextIndex = messageIndex + 1;
//       while (nextIndex < messages.length && messages[nextIndex].role === message.role) {
//         concatenatedContent += " " + messages[nextIndex].content;
//         nextIndex++;
//       }

//       result.push({ ...message, content: concatenatedContent });
//       messageIndex = nextIndex; // Move index forward to the end of concatenated messages
//     } else {
//       const tool = toolCalls[toolIndex];
//       result.push({
//         ...tool,
//         type: "toolCall" as const,
//       });
//       toolIndex++;
//     }
//   }

//   // Add remaining messages with concatenation
//   while (messageIndex < messages.length) {
//     const message = messages[messageIndex];
//     let concatenatedContent = message.content;
//     let nextIndex = messageIndex + 1;
//     while (nextIndex < messages.length && messages[nextIndex].role === message.role) {
//       concatenatedContent += " " + messages[nextIndex].content;
//       nextIndex++;
//     }

//     result.push({ ...message, content: concatenatedContent });
//     messageIndex = nextIndex;
//   }

//   // Add remaining tool calls
//   while (toolIndex < toolCalls.length) {
//     const tool = toolCalls[toolIndex];
//     result.push({
//       ...tool,
//       type: "toolCall" as const,
//     });
//     toolIndex++;
//   }

//   return result;
// }

// There must be a function that will ensure there's no issues with order of messages.
// E.g. API will return error if 2 assistant messages go in a row. Or 2 messages from the user.
// IDK what are the rules about toolcalls, Maybe they should not be used during sorting and somehow stay at same places in the list.
export function mergeMessages(messages: AgentMessage[], toolCalls: ToolCall[]): ConversationEntry[] {
  return [];
}
