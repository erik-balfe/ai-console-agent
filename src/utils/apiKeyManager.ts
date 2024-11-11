import { Entry } from "@napi-rs/keyring";
import { APIProvider } from "../constants";
import { getProviderFromModel } from "./getOrPromptForAPIKey";
import { logger } from "./logger";

const SERVICE_NAME = "AIConsoleAgent";

const getEntryForProvider = (provider: APIProvider): Entry => {
  return new Entry(SERVICE_NAME, `${provider}APIKey`);
};

export function storeAPIKey(apiKey: string, provider: APIProvider): void {
  try {
    const entry = getEntryForProvider(provider);
    entry.setPassword(apiKey);
    logger.debug(`${provider} API key stored successfully`);
  } catch (error) {
    logger.error(`Failed to store ${provider} API key:`, error);
    throw new Error(`Failed to securely store the ${provider} API key`);
  }
}

export function getAPIKey(provider: APIProvider): string | null {
  try {
    const entry = getEntryForProvider(provider);
    const apiKey = entry.getPassword();
    logger.debug(`${provider} API key retrieved successfully`);
    return apiKey;
  } catch (error) {
    if (error instanceof Error && error.message.includes("No password found")) {
      logger.debug(`No ${provider} API key found in keyring`);
      return null;
    }
    logger.error(`Failed to retrieve ${provider} API key:`, error);
    return null;
  }
}

export function deleteAPIKey(modelId: string): boolean {
  try {
    const provider = getProviderFromModel(modelId);
    const entry = getEntryForProvider(provider);
    entry.deletePassword();
    logger.debug(`${provider} API key deleted successfully`);
    return true;
  } catch (error) {
    logger.error(`Failed to delete ${modelId} API key:`, error);
    return false;
  }
}
