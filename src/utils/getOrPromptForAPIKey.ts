import chalk from "chalk";
import { getFreeformInput } from "../cli/interface";
import { API_KEY_PREFIXES, API_KEY_PROMPTS, APIProvider, EMBEDDINGS_MODEL_ID } from "../constants";
import { getAPIKey, storeAPIKey } from "./apiKeyManager";
import { debug, error } from "./logger/Logger";

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
        debug(`${provider} API key found in keyring`);
        if (isValidAPIKey(apiKey, provider)) {
          debug(`${provider} API key: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}`);
          return apiKey;
        } else {
          debug(`Stored ${provider} API key is invalid, prompting for a new one`);
          apiKey = null;
        }
      } else {
        debug(`${provider} API key not found in keyring`);
      }

      if (!apiKey) {
        try {
          debug(`Prompting user for ${provider} API key`);

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
          debug(`Invalid ${provider} API key provided by user`);
          console.error(
            chalk.red(
              `Invalid API key. It should not be empty and should be 32 characters long for DeepInfra or start with '${API_KEY_PREFIXES[provider]}' for other providers.`,
            ),
          );
          retries++;
          continue;
        }

        await storeAPIKey(apiKey, provider);
        debug(`New ${provider} API key stored successfully`);
        console.log(chalk.green(`${provider} API key has been securely stored.`));
      }

      return apiKey;
    } catch (err) {
      error(`Error managing ${provider} API key:`, err);
      console.error(chalk.red(`Error managing ${provider} API key:`), err);
      retries++;
    }
  }

  error(`Failed to obtain a valid ${provider} API key after 5 attempts`);
  console.error(
    chalk.red(`Failed to obtain a valid ${provider} API key after 5 attempts. Exiting the program.`),
  );
  process.exit(1);
}

export async function getApiKeyForModel(modelId: string): Promise<string> {
  const apiKey = await getOrPromptForAPIKey(modelId);

  if (!apiKey) {
    error(`No ${modelId} API key found`);
    throw new Error(`${modelId} API key not found. Please run the application again to set it up.`);
  }

  return apiKey;
}

function isValidAPIKey(apiKey: string, provider: APIProvider): boolean {
  if (provider === "DEEPINFRA") {
    return apiKey.trim() !== "" && apiKey.length === 32;
  }
  return apiKey.trim() !== "" && apiKey.startsWith(API_KEY_PREFIXES[provider]);
}

export function getProviderFromModel(modelId: string): APIProvider {
  debug(`Checking model ID: ${modelId}`);
  const lowerCaseModelId = modelId.toLowerCase();

  if (lowerCaseModelId.startsWith("gpt")) {
    debug(`Matched model ID with OPENAI`);
    return "OPENAI";
  }
  if (lowerCaseModelId.startsWith("llama")) {
    debug(`Matched model ID with GROQ`);
    return "GROQ";
  }
  if (lowerCaseModelId.startsWith("claude")) {
    debug(`Matched model ID with ANTHROPIC`);
    return "ANTHROPIC";
  }
  if (lowerCaseModelId.startsWith("qwen")) {
    debug(`Matched model ID with DEEPINFRA`);
    return "DEEPINFRA";
  }
  if (EMBEDDINGS_MODEL_ID.toLowerCase() === lowerCaseModelId) {
    debug(`Matched model ID with OPENAI for embeddings`);
    return "OPENAI";
  }

  error(`Unsupported model ID: ${lowerCaseModelId}`);
  throw new Error(`Unsupported model ID: ${lowerCaseModelId}`);
}
