import { getCircularReplacer } from "./getCircularReplacer";
import { logger } from "./logger";

export function parseLLMResponse(response: any) {
  let textAnswer: string | null = null;
  // logger.debug("response to parse:", JSON.stringify(response, getCircularReplacer(), 2));

  if (typeof response.output?.message.content === "string") {
    textAnswer = response.output.message.content;
  } else if (Array.isArray(response.output?.message.content)) {
    const lastMessage = response.output?.message.content.at(-1);
    if (lastMessage?.type === "text") {
      textAnswer = lastMessage.text;
    }
    // If it's not a text message, return null
  }

  const usage = response.output?.raw?.usage ?? { input_tokens: 0, output_tokens: 0 };
  return { content: textAnswer, usage };
}
