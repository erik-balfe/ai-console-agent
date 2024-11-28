import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "crypto";
import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { getUserHomeDir } from "../getUserHomeDir";
import { SecureStorage } from "./interface";

export class FileStorage implements SecureStorage {
  private readonly configDir: string;
  private readonly keysFile: string;
  // Use machine-specific data as additional entropy
  private readonly machineId: string;

  constructor() {
    this.configDir = path.join(getUserHomeDir(), ".ai-console-agent");
    this.keysFile = path.join(this.configDir, ".secure_storage");
    // Use username and home directory hash as machine ID
    this.machineId = createHash("sha256")
      .update(process.env.USER || "")
      .update(getUserHomeDir())
      .digest("hex")
      .slice(0, 32);
  }

  private async ensureConfigDir(): Promise<void> {
    if (!existsSync(this.configDir)) {
      await mkdir(this.configDir, { recursive: true, mode: 0o700 });
    }
  }

  private async encrypt(data: string): Promise<string> {
    const salt = randomBytes(16);
    const key = scryptSync(this.machineId, salt, 32);
    const iv = randomBytes(16);
    const cipher = createCipheriv("aes-256-gcm", key, iv);

    const encrypted = Buffer.concat([cipher.update(data, "utf8"), cipher.final()]);

    const authTag = cipher.getAuthTag();

    // Combine all pieces: salt + iv + authTag + encrypted
    const result = Buffer.concat([salt, iv, authTag, encrypted]);
    return result.toString("base64");
  }

  private async decrypt(encryptedData: string): Promise<string> {
    const data = Buffer.from(encryptedData, "base64");

    const salt = data.subarray(0, 16);
    const iv = data.subarray(16, 32);
    const authTag = data.subarray(32, 48);
    const encrypted = data.subarray(48);

    const key = scryptSync(this.machineId, salt, 32);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    return decipher.update(encrypted) + decipher.final("utf8");
  }

  async get(key: string): Promise<string | null> {
    try {
      await this.ensureConfigDir();

      if (!existsSync(this.keysFile)) {
        return null;
      }

      const data = await readFile(this.keysFile, "utf8");
      const storage = JSON.parse(await this.decrypt(data));
      return storage[key] || null;
    } catch (error) {
      logger.error("Error reading from secure storage:", error);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      await this.ensureConfigDir();

      let storage: Record<string, string> = {};

      if (existsSync(this.keysFile)) {
        const data = await readFile(this.keysFile, "utf8");
        storage = JSON.parse(await this.decrypt(data));
      }

      storage[key] = value;
      const encrypted = await this.encrypt(JSON.stringify(storage));
      await writeFile(this.keysFile, encrypted, { mode: 0o600 });
    } catch (error) {
      logger.error("Error writing to secure storage:", error);
      throw error;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      if (!existsSync(this.keysFile)) {
        return false;
      }

      const data = await readFile(this.keysFile, "utf8");
      const storage = JSON.parse(await this.decrypt(data));

      if (!(key in storage)) {
        return false;
      }

      delete storage[key];
      const encrypted = await this.encrypt(JSON.stringify(storage));
      await writeFile(this.keysFile, encrypted, { mode: 0o600 });
      return true;
    } catch (error) {
      logger.error("Error deleting from secure storage:", error);
      return false;
    }
  }
}
