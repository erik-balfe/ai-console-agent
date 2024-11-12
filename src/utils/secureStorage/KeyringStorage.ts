import { Entry } from "@napi-rs/keyring";
import { logger } from "../logger";
import { SecureStorage } from "./interface";

export class KeyringStorage implements SecureStorage {
  private readonly serviceName: string;
  private readonly userName: string;

  constructor(serviceName: string, userName: string) {
    this.serviceName = serviceName;
    this.userName = userName;
  }

  private getEntry(key: string): Entry {
    const fullKey = `${this.userName}_${key}`;
    logger.debug(`Using keyring entry with key: ${fullKey}`);
    return new Entry(this.serviceName, fullKey);
  }

  async get(key: string): Promise<string | null> {
    try {
      const entry = this.getEntry(key);
      const value = entry.getPassword();
      logger.debug(`Retrieved value for key ${key}`);
      return value;
    } catch (error) {
      logger.error(`Keyring get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      const entry = this.getEntry(key);
      entry.setPassword(value);
      logger.debug(`Stored value for key ${key}`);
    } catch (error) {
      logger.error(`Keyring set error for key ${key}:`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const entry = this.getEntry(key);
      const result = entry.deletePassword();
      logger.debug(`Deleted value for key ${key}`);
      return result;
    } catch (error) {
      logger.error(`Keyring delete error for key ${key}:`, error);
      return false;
    }
  }
}
