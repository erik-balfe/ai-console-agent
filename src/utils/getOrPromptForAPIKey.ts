import chalk from "chalk";
import { getFreeformInput } from "../cli/interface";
import { API_KEY_PREFIXES, API_KEY_PROMPTS, APIProvider } from "../constants";
import { getAPIKey, storeAPIKey } from "./apiKeyManager";
import { logger } from "./logger";

const MAX_RETRIES = 5;

export async function getOrPromptForAPIKey(modelId: string, forceNew: boolean = false): Promise<string> {
  const provider = getProviderFromModel(modelId);
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      let apiKey = forceNew ? null : await getAPIKey(provider);

      if (apiKey) {
        logger.debug(`${provider} API key found in keyring`);
        if (isValidAPIKey(apiKey, provider)) {
          logger.debug(
            `${provider} API key: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}`,
          );
          return apiKey;
        } else {
          logger.debug(`Stored ${provider} API key is invalid, prompting for a new one`);
          apiKey = null;
        }
      } else {
        logger.debug(`${provider} API key not found in keyring`);
      }

      if (!apiKey) {
        logger.debug(`Prompting user for ${provider} API key`);
        console.log(chalk.yellow(`${provider} API key not found or invalid.`));
        apiKey = await getFreeformInput(API_KEY_PROMPTS[provider], true);

        if (!isValidAPIKey(apiKey, provider)) {
          logger.debug(`Invalid ${provider} API key provided by user`);
          console.error(
            chalk.red(
              `Invalid API key. It should not be empty and should start with '${API_KEY_PREFIXES[provider]}'.`,
            ),
          );
          retries++;
          continue;
        }

        storeAPIKey(apiKey, provider);
        logger.debug(`New ${provider} API key stored successfully`);
        console.log(chalk.green(`${provider} API key has been securely stored.`));
      }

      return apiKey;
    } catch (error) {
      logger.error(`Error managing ${provider} API key:`, error);
      console.error(chalk.red(`Error managing ${provider} API key:`), error);
      retries++;
    }
  }

  logger.error(`Failed to obtain a valid ${provider} API key after 5 attempts`);
  console.error(
    chalk.red(`Failed to obtain a valid ${provider} API key after 5 attempts. Exiting the program.`),
  );
  process.exit(1);
}

function isValidAPIKey(apiKey: string, provider: APIProvider): boolean {
  return apiKey.trim() !== "" && apiKey.startsWith(API_KEY_PREFIXES[provider]);
}

export function getProviderFromModel(modelId: string): APIProvider {
  let result: APIProvider | undefined = undefined;

  if (modelId.startsWith("gpt")) result = "OPENAI";
  if (modelId.startsWith("llama")) result = "GROQ";
  if (modelId.startsWith("claude")) result = "ANTHROPIC";
  if (!result) throw new Error(`Unsupported model ID: ${modelId}`);
  logger.debug(`Model ID ${modelId} matches a supported API provider, "${result}"`);
  return result;
}

export async function getApiKeyForModel(modelId: string): Promise<string> {
  const apiKey = await getOrPromptForAPIKey(modelId);

  if (!apiKey) {
    logger.error(`No ${modelId} API key found`);
    throw new Error(`${modelId} API key not found. Please run the application again to set it up.`);
  }

  return apiKey;
}
