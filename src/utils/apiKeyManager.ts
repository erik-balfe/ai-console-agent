import { Entry } from "@napi-rs/keyring";
import { APIProvider } from "../constants";
import { getProviderFromModel } from "./getOrPromptForAPIKey";
import { logger } from "./logger";
import { SecureFileStorage } from "./secureStorage/fileStorage";

const SERVICE_NAME = "AIConsoleAgent";

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

class StorageManager {
  private storage: Storage | null = null;

  private async initializeStorage(): Promise<Storage> {
    try {
      logger.debug("Trying to initialize keyring storage...");
      const testEntry = new Entry("test-service", "test-user");
      testEntry.setPassword("test");
      testEntry.deletePassword();

      logger.debug("Keyring storage is available");
      return new KeyringStorage(SERVICE_NAME, "APIKeys");
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("Platform secure storage failure") ||
          error.message.includes("Operation not permitted"))
      ) {
        logger.debug("Running on a system without keyring support, using file storage");
        return new SecureFileStorage();
      }

      logger.error("Unexpected error during storage initialization:", error);
      logger.debug("Falling back to file storage");
      return new SecureFileStorage();
    }
  }

  private async getStorage(): Promise<Storage> {
    if (!this.storage) {
      this.storage = await this.initializeStorage();
    }
    return this.storage;
  }

  async getAPIKey(provider: APIProvider): Promise<string | null> {
    try {
      logger.debug(`Attempting to retrieve ${provider} API key`);
      const storage = await this.getStorage();
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

  async storeAPIKey(apiKey: string, provider: APIProvider): Promise<void> {
    try {
      logger.debug(`Attempting to store ${provider} API key`);
      const storage = await this.getStorage();
      await storage.set(`${provider}APIKey`, apiKey);
      logger.debug(`${provider} API key stored successfully`);
    } catch (error) {
      logger.error(`Failed to store ${provider} API key:`, error);
      throw new Error(`Failed to securely store the ${provider} API key`);
    }
  }

  async deleteAPIKey(modelId: string): Promise<boolean> {
    try {
      const provider = getProviderFromModel(modelId);
      logger.debug(`Attempting to delete ${provider} API key`);
      const storage = await this.getStorage();
      const result = await storage.delete(`${provider}APIKey`);
      logger.debug(`${provider} API key deletion ${result ? "successful" : "failed"}`);
      return result;
    } catch (error) {
      logger.error(`Failed to delete ${modelId} API key:`, error);
      return false;
    }
  }

  async checkStorageAvailability(): Promise<string> {
    try {
      const storage = await this.getStorage();
      const testKey = "test-key";
      const testValue = "test-value";

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

  getStorageDiagnostics(): string {
    const diagnostics = [
      `Operating System: ${process.platform}`,
      `Process UID: ${process.getuid?.()}`,
      `Process GID: ${process.getgid?.()}`,
      `Storage Type: ${this.storage instanceof SecureFileStorage ? "File Storage" : "Keyring Storage"}`,
      `Node Version: ${process.version}`,
    ];

    return diagnostics.join("\n");
  }
}

// Export a singleton instance
const storageManager = new StorageManager();

// Export the methods
export const getAPIKey = (provider: APIProvider) => storageManager.getAPIKey(provider);
export const storeAPIKey = (apiKey: string, provider: APIProvider) =>
  storageManager.storeAPIKey(apiKey, provider);
export const deleteAPIKey = (modelId: string) => storageManager.deleteAPIKey(modelId);
export const checkStorageAvailability = () => storageManager.checkStorageAvailability();
export const getStorageDiagnostics = () => storageManager.getStorageDiagnostics();
