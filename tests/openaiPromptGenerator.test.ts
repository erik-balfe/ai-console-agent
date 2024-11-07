import { expect, test } from "bun:test";
import * as dotenv from "dotenv";
import { generatePrompt } from "../src/utils/openaiPromptGenerator";

dotenv.config();

test("generatePrompt returns expected prompt", async () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key for tests in not passed. Please set up your API key.");
  }
  const modelName = "gpt-4o-mini";
  const taskDescription = "Create a strategy for development of a paid AI app.";

  const prompt = await generatePrompt(taskDescription, apiKey, modelName);
  console.log("Resulting prompt:\n\n\n------\n\n", prompt, "\n------\n");
  expect(prompt.length).toBeGreaterThan(20);
});

// ❯ bun test --test-name-pattern generatePrompt --timeout 30000
