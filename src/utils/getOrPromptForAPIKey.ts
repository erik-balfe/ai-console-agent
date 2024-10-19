import chalk from "chalk";
import { getFreeformInput } from "../cli/interface";
import { OPENAI_API_KEY_PROMPT } from "../constants";
import { getAPIKey, storeAPIKey } from "./apiKeyManager";
import { logger } from "./logger";

const MAX_RETRIES = 5;

export async function getOrPromptForAPIKey(forceNew: boolean = false): Promise<string> {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      let apiKey = forceNew ? null : getAPIKey();

      if (apiKey) {
        logger.debug("API key found in keyring");
        if (isValidAPIKey(apiKey)) {
          logger.debug(`API key: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}`);
          return apiKey;
        } else {
          logger.debug("Stored API key is invalid, prompting for a new one");
          apiKey = null;
        }
      } else {
        logger.debug("API key not found in keyring");
      }

      if (!apiKey) {
        logger.debug("Prompting user for API key");
        console.log(chalk.yellow("OpenAI API key not found or invalid."));
        apiKey = await getFreeformInput(OPENAI_API_KEY_PROMPT, true);

        if (!isValidAPIKey(apiKey)) {
          logger.debug("Invalid API key provided by user");
          console.error(chalk.red("Invalid API key. It should not be empty and should start with 'sk-'."));
          retries++;
          continue;
        }

        storeAPIKey(apiKey);
        logger.debug("New API key stored successfully");
        console.log(chalk.green("API key has been securely stored."));
      }

      return apiKey;
    } catch (error) {
      logger.error("Error managing API key:", error);
      console.error(chalk.red("Error managing API key:"), error);
      retries++;
    }
  }

  logger.error("Failed to obtain a valid API key after 5 attempts");
  console.error(chalk.red("Failed to obtain a valid API key after 5 attempts. Exiting the program."));
  process.exit(1);
}

function isValidAPIKey(apiKey: string): boolean {
  return apiKey.trim() !== "" && apiKey.startsWith("sk-");
}
