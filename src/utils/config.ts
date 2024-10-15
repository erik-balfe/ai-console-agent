import fs from "fs";
import path from "path";
import { LogLevel } from "./logger";

const CONFIG_FILE = path.join(
  process.env.HOME || process.env.USERPROFILE || "",
  ".ai-console-agent-config.json",
);

export interface Config {
  logLevel: LogLevel;
  techExpertiseLevel: number; // 1-5, where 1 is least tech-savvy and 5 is most tech-savvy
  [key: string]: any; // Allow for future custom fields
}

const DEFAULT_CONFIG: Config = {
  logLevel: LogLevel.WARN,
  techExpertiseLevel: 1,
};

export function loadConfig(): Config {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
      return { ...DEFAULT_CONFIG, ...config };
    }
  } catch (error) {
    console.error("Error loading config:", error);
  }
  return DEFAULT_CONFIG;
}

export function saveConfig(config: Partial<Config>): void {
  const currentConfig = loadConfig();
  const newConfig = { ...currentConfig, ...config };
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2));
  } catch (error) {
    console.error("Error saving config:", error);
  }
}

export function updateConfig(key: string, value: any): void {
  const config = loadConfig();
  config[key] = value;
  saveConfig(config);
}
