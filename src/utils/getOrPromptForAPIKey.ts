import chalk from "chalk";
import { getFreeformInput } from "../cli/interface";
import { API_KEY_PREFIXES, API_KEY_PROMPTS, APIProvider, EMBEDDINGS_MODEL_ID } from "../constants";
import { getAPIKey, storeAPIKey } from "./apiKeyManager";
import { logger } from "./logger";

const MAX_RETRIES = 5;

interface GetAPIKeyOptions {
  forceNew?: boolean;
  prePromptText?: string;
}

export async function getOrPromptForAPIKey(modelId: string, options: GetAPIKeyOptions = {}): Promise<string> {
  const { forceNew = false, prePromptText } = options;
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
        try {
          logger.debug(`Prompting user for ${provider} API key`);

          const text = prePromptText
            ? chalk.yellow(prePromptText)
            : `${provider} API key not found or invalid.`;
          console.log(chalk.yellow(text));
          apiKey = await getFreeformInput(API_KEY_PROMPTS[provider], true);
        } catch (inputError) {
          if (inputError.message.includes("non-interactive mode")) {
            console.error(chalk.red(inputError.message));
            process.exit(1);
          }
          throw inputError;
        }
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

        await storeAPIKey(apiKey, provider);
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

export async function getApiKeyForModel(modelId: string): Promise<string> {
  const apiKey = await getOrPromptForAPIKey(modelId);

  if (!apiKey) {
    logger.error(`No ${modelId} API key found`);
    throw new Error(`${modelId} API key not found. Please run the application again to set it up.`);
  }

  return apiKey;
}

function isValidAPIKey(apiKey: string, provider: APIProvider): boolean {
  return apiKey.trim() !== "" && apiKey.startsWith(API_KEY_PREFIXES[provider]);
}

export function getProviderFromModel(modelId: string): APIProvider {
  let result: APIProvider | undefined = undefined;

  if (modelId.startsWith("gpt")) result = "OPENAI";
  if (modelId.startsWith("llama")) result = "GROQ";
  if (modelId.startsWith("claude")) result = "ANTHROPIC";
  if (EMBEDDINGS_MODEL_ID === modelId) result = "OPENAI";
  if (!result) throw new Error(`Unsupported model ID: ${modelId}`);
  logger.debug(`Model ID ${modelId} matches a supported API provider, "${result}"`);
  return result;
}
