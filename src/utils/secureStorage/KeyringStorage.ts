import { Entry } from "@napi-rs/keyring";
import { debug, error } from "../logger/Logger";
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
    debug(`Using keyring entry with key: ${fullKey}`);
    return new Entry(this.serviceName, fullKey);
  }

  async get(key: string): Promise<string | null> {
    try {
      const entry = this.getEntry(key);
      const value = entry.getPassword();
      debug(`Retrieved value for key ${key}`);
      return value;
    } catch (err) {
      error(`Keyring get error for key ${key}:`, err);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      const entry = this.getEntry(key);
      entry.setPassword(value);
      debug(`Stored value for key ${key}`);
    } catch (err) {
      error(`Keyring set error for key ${key}:`, err);
      throw err;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const entry = this.getEntry(key);
      const result = entry.deletePassword();
      debug(`Deleted value for key ${key}`);
      return result;
    } catch (err) {
      error(`Keyring delete error for key ${key}:`, err);
      return false;
    }
  }
}
