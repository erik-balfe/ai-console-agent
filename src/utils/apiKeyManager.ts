import { Entry } from "@napi-rs/keyring";
import { APIProvider } from "../constants";
import { getProviderFromModel } from "./getOrPromptForAPIKey";
import { debug, error } from "./logger/Logger";
import { FileStorage } from "./secureStorage/FileStorage";
import { SecureStorage } from "./secureStorage/interface";
import { KeyringStorage } from "./secureStorage/KeyringStorage";

const SERVICE_NAME = "AIConsoleAgent";

class StorageManager {
  private storage: SecureStorage | null = null;

  private async initializeStorage(): Promise<SecureStorage> {
    try {
      debug("Trying to initialize keyring storage...");
      const testEntry = new Entry("test-service", "test-user");
      testEntry.setPassword("test");
      testEntry.deletePassword();

      debug("Keyring storage is available");
      return new KeyringStorage(SERVICE_NAME, "APIKeys");
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes("Platform secure storage failure") ||
          err.message.includes("Operation not permitted"))
      ) {
        debug("Running on a system without keyring support, using file storage");
        return new FileStorage();
      }

      error("Unexpected error during storage initialization:", err);
      debug("Falling back to file storage");
      return new FileStorage();
    }
  }

  private async getStorage(): Promise<SecureStorage> {
    if (!this.storage) {
      this.storage = await this.initializeStorage();
    }
    return this.storage;
  }

  async getAPIKey(provider: APIProvider): Promise<string | null> {
    try {
      debug(`Attempting to retrieve ${provider} API key`);
      const storage = await this.getStorage();
      const key = await storage.get(`${provider}APIKey`);

      if (key) {
        debug(`${provider} API key retrieved successfully (first 4 chars: ${key.slice(0, 4)}...)`);
      } else {
        debug(`No ${provider} API key found`);
      }

      return key;
    } catch (err) {
      error(`Failed to retrieve ${provider} API key:`, err);
      return null;
    }
  }

  async storeAPIKey(apiKey: string, provider: APIProvider): Promise<void> {
    try {
      debug(`Attempting to store ${provider} API key`);
      const storage = await this.getStorage();
      await storage.set(`${provider}APIKey`, apiKey);
      debug(`${provider} API key stored successfully`);
    } catch (err) {
      error(`Failed to store ${provider} API key:`, err);
      throw new Error(`Failed to securely store the ${provider} API key`);
    }
  }

  async deleteAPIKey(modelId: string): Promise<boolean> {
    try {
      const provider = getProviderFromModel(modelId);
      debug(`Attempting to delete ${provider} API key`);
      const storage = await this.getStorage();
      const result = await storage.delete(`${provider}APIKey`);
      debug(`${provider} API key deletion ${result ? "successful" : "failed"}`);
      return result;
    } catch (err) {
      error(`Failed to delete ${modelId} API key:`, error);
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

      const storageType = storage instanceof FileStorage ? "File Storage" : "Keyring Storage";

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
      `Storage Type: ${this.storage instanceof FileStorage ? "File Storage" : "Keyring Storage"}`,
      `Node Version: ${process.version}`,
    ];

    return diagnostics.join("\n");
  }
}

// Export a singleton instance
const storageManager = new StorageManager();

// Export the methods
export const getAPIKey = async (provider: APIProvider) => storageManager.getAPIKey(provider);
export const storeAPIKey = async (apiKey: string, provider: APIProvider) =>
  storageManager.storeAPIKey(apiKey, provider);
export const deleteAPIKey = async (modelId: string) => storageManager.deleteAPIKey(modelId);
export const checkStorageAvailability = async () => storageManager.checkStorageAvailability();
export const getStorageDiagnostics = async () => storageManager.getStorageDiagnostics();
