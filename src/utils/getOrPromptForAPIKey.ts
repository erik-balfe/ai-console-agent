import chalk from "chalk";
import { getFreeformInput } from "../cli/interface";
import { OPENAI_API_KEY_PROMPT } from "../constants";
import { getAPIKey, storeAPIKey } from "./apiKeyManager";

const MAX_RETRIES = 5;

export async function getOrPromptForAPIKey(forceNew: boolean = false): Promise<string> {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      let apiKey = forceNew ? null : await getAPIKey();

      if (!apiKey || !isValidAPIKey(apiKey)) {
        console.log(chalk.yellow("OpenAI API key not found or invalid."));
        apiKey = await getFreeformInput(OPENAI_API_KEY_PROMPT, true);

        if (!isValidAPIKey(apiKey)) {
          console.error(chalk.red("Invalid API key. It should not be empty and should start with 'sk-'."));
          retries++;
          continue;
        }

        await storeAPIKey(apiKey);
        console.log(chalk.green("API key has been securely stored."));
      }

      return apiKey;
    } catch (error) {
      console.error(chalk.red("Error managing API key:"), error);
      retries++;
    }
  }

  console.error(chalk.red("Failed to obtain a valid API key after 5 attempts. Exiting the program."));
  process.exit(1);
}

function isValidAPIKey(apiKey: string): boolean {
  return apiKey.trim() !== "" && apiKey.startsWith("sk-");
}
