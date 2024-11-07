import { OpenAI } from "llamaindex";
import { FullConversationData } from "./database";
import { logger } from "./logger";

const prompt =
  `Create a concise title for a series of messages from an AI agent, including the initial user query and the agent's subsequent steps and final response. The title should accurately reflect the main intent of the user's query, the agent's analysis and reasoning throughout the messages, and the ultimate conclusion or result provided by the agent. The title must be a short phrase with no more than 10 words.

  Adhere to the following strict rules:
  - The output must always return a result without asking for anything, initiating conversations, or seeking clarifications.
  - The process must work in a single run and require no further interaction.

  # Steps

  1. Analyze the initial user query to identify the main intent.
  2. Review the series of agent messages, including any thought processes and steps taken.
  3. Consider the final result or conclusion provided by the agent.
  4. Formulate a title that summarizes the essence of the discussion while highlighting the key components.
  5. Ensure the title does not exceed 10 words.

  # Output Format

  Provide the title as a single short phrase, not longer than 10 words. No formatting is allowed, just plain text without any additional tags, annotations, formatting, or symbols.

  # Examples

  - **Input:** User queries how to check the operating system version; agent describes the command to execute, details the process, and concludes with the OS version and its features.
    **Output:** "Checking Operating System Version with Command"

  (Note: Real examples should be longer or different based on the content of actual messages.)

  # Notes

  Ensure the title accurately captures the progression of the conversation, including the progression of thoughts and steps taken by the agent, and the final output given.`.trim();

export interface LlmCallArgs {
  prompt: string;
  apiKey: string;
  modelName: string;
}

export async function generateConversationTitle(
  fullconversationData: FullConversationData,
  { apiKey, modelName },
): Promise<string> {
  logger.debug("Starting conversation title generation");
  logger.debug(`Input fullConversationData: ${JSON.stringify(fullconversationData)}`);

  const llm = new OpenAI({ apiKey, model: modelName });

  try {
    const response = await llm.chat({
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: `The messages of the conversation:\n${JSON.stringify(fullconversationData)}`,
        },
      ],
    });

    // Step 4: Log the generated title
    logger.debug("Title generated successfully");
    logger.debug(`Generated Title: ${response.message.content}`);

    return response.message.content;
  } catch (error) {
    logger.error("Error generating conversation title:", error);
    throw error; // Rethrow error after logging
  }
}
