import { Entry } from "@napi-rs/keyring";
import { APIProvider } from "../constants";
import { getProviderFromModel } from "./getOrPromptForAPIKey";
import { logger } from "./logger";
import { SecureFileStorage } from "./secureStorage/fileStorage";

const SERVICE_NAME = "AIConsoleAgent";

// Storage interface to handle both types
interface Storage {
  get(key: string): string | null | Promise<string | null>;
  set(key: string, value: string): void | Promise<void>;
  delete(key: string): boolean | Promise<boolean>;
}

class KeyringStorage implements Storage {
  private entry: Entry;

  constructor(service: string, key: string) {
    this.entry = new Entry(service, key);
  }

  get(key: string): string | null {
    try {
      return this.entry.getPassword();
    } catch (error) {
      logger.error("Keyring get error:", error);
      return null;
    }
  }

  set(key: string, value: string): void {
    this.entry.setPassword(value);
  }

  delete(key: string): boolean {
    return this.entry.deletePassword();
  }
}

// Initialize storage
let storage: Storage;

async function initializeStorage(): Promise<Storage> {
  try {
    logger.debug("Trying to initialize keyring storage...");
    // Test keyring availability
    const testEntry = new Entry("test-service", "test-user");
    testEntry.setPassword("test");
    testEntry.deletePassword();

    logger.debug("Keyring storage is available");
    return new KeyringStorage(SERVICE_NAME, "APIKeys");
  } catch (error) {
    logger.debug("Keyring storage not available, falling back to file storage:", error);
    return new SecureFileStorage();
  }
}

// Initialize storage when module is loaded
(async () => {
  storage = await initializeStorage();
})();

export async function getAPIKey(provider: APIProvider): Promise<string | null> {
  try {
    logger.debug(`Attempting to retrieve ${provider} API key`);
    const key = await storage.get(`${provider}APIKey`);

    if (key) {
      logger.debug(`${provider} API key retrieved successfully (first 4 chars: ${key.slice(0, 4)}...)`);
    } else {
      logger.debug(`No ${provider} API key found`);
    }

    return key;
  } catch (error) {
    logger.error(`Failed to retrieve ${provider} API key:`, error);
    return null;
  }
}

export async function storeAPIKey(apiKey: string, provider: APIProvider): Promise<void> {
  try {
    logger.debug(`Attempting to store ${provider} API key`);
    await storage.set(`${provider}APIKey`, apiKey);
    logger.debug(`${provider} API key stored successfully`);
  } catch (error) {
    logger.error(`Failed to store ${provider} API key:`, error);
    throw new Error(`Failed to securely store the ${provider} API key`);
  }
}

export async function deleteAPIKey(modelId: string): Promise<boolean> {
  try {
    const provider = getProviderFromModel(modelId);
    logger.debug(`Attempting to delete ${provider} API key`);
    const result = await storage.delete(`${provider}APIKey`);
    logger.debug(`${provider} API key deletion ${result ? "successful" : "failed"}`);
    return result;
  } catch (error) {
    logger.error(`Failed to delete ${modelId} API key:`, error);
    return false;
  }
}

export async function checkStorageAvailability(): Promise<string> {
  try {
    const testKey = "test-key";
    const testValue = "test-value";

    // Test storage operations
    await storage.set(testKey, testValue);
    const retrieved = await storage.get(testKey);
    await storage.delete(testKey);

    const storageType = storage instanceof SecureFileStorage ? "File Storage" : "Keyring Storage";

    if (retrieved === testValue) {
      return `Storage system (${storageType}) is working correctly`;
    } else {
      return `Storage system (${storageType}) failed verification`;
    }
  } catch (error) {
    return `Storage system error: ${error}`;
  }
}

// Add this if you still want to get diagnostics about the system
export function getStorageDiagnostics(): string {
  const diagnostics = [
    `Operating System: ${process.platform}`,
    `Process UID: ${process.getuid?.()}`,
    `Process GID: ${process.getgid?.()}`,
    `Storage Type: ${storage instanceof SecureFileStorage ? "File Storage" : "Keyring Storage"}`,
    `Node Version: ${process.version}`,
  ];

  return diagnostics.join("\n");
}
