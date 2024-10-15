import { Entry } from "@napi-rs/keyring";
import { logger } from "./logger";

const SERVICE_NAME = "AIConsoleAgent";
const ACCOUNT_NAME = "OpenAIAPIKey";

const entry = new Entry(SERVICE_NAME, ACCOUNT_NAME);

export function storeAPIKey(apiKey: string): void {
  try {
    entry.setPassword(apiKey);
    logger.debug("API key stored successfully");
  } catch (error) {
    logger.error("Failed to store API key:", error);
    throw new Error("Failed to securely store the API key");
  }
}

export function getAPIKey(): string | null {
  try {
    const apiKey = entry.getPassword();
    logger.debug("API key retrieved successfully");
    return apiKey;
  } catch (error) {
    if (error instanceof Error && error.message.includes("No password found")) {
      logger.debug("No API key found in keyring");
      return null;
    }
    logger.error("Failed to retrieve API key:", error);
    return null;
  }
}

export function deleteAPIKey(): boolean {
  try {
    entry.deletePassword();
    logger.debug("API key deleted successfully");
    return true;
  } catch (error) {
    logger.error("Failed to delete API key:", error);
    return false;
  }
}
