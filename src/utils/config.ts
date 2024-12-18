import { execSync } from "child_process";
import fs from "fs";
import * as os from "os";
import * as path from "path";
import { APP_CONFIG_FILE_PATH, CONFIG_DIR_PATH, MODELS, USER_PREFS_FILE_PATH } from "../constants";
import { LogLevel, LogLevelType } from "./logger";

export interface AppConfig {
  logging: LoggingConfig;
  model: string;
  contextWindowLimit?: number;
  // ... other app settings,
}

export interface UserPreferences extends Record<string, any> {
  techExpertiseLevel: number;
  preferredName?: string;
  // ... other user preferences
}

export interface LoggingConfig {
  level: LogLevelType;
  enabled: boolean;
  path: string;
  consoleOutputEnabled?: boolean;
}

const DEFAULT_APP_CONFIG: AppConfig = {
  logging: {
    level: LogLevel.WARN,
    enabled: true,
    path: path.join(os.homedir(), ".ai-console-agent/logs/ai-console-agent.log"),
    consoleOutputEnabled: false,
  },
  model: Object.values(MODELS).find((model) => model.default)?.id || "",
  contextWindowLimit: Infinity,
};

const DEFAULT_USER_PREFS: UserPreferences = {
  techExpertiseLevel: 0.5,
};

// Add new interfaces
interface ParsedConfigLine {
  key?: string;
  value?: string;
  comment?: string;
  raw: string;
}

interface ConfigData {
  parsed: Record<string, string>;
  raw: string;
  lines: ParsedConfigLine[];
}

function parseConfigFile(filePath: string): ConfigData {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const parsed: Record<string, string> = {};
  const parsedLines: ParsedConfigLine[] = [];

  for (const line of lines) {
    const parsedLine: ParsedConfigLine = { raw: line };
    const trimmedLine = line.trim();

    if (trimmedLine) {
      // Handle pure comment lines
      if (trimmedLine.startsWith("#")) {
        parsedLine.comment = trimmedLine.substring(1).trim();
      } else {
        // Handle config lines with potential inline comments
        const [configPart, ...commentParts] = line.split("#");
        const [key, value] = configPart.split("=").map((part) => part.trim());

        if (key && value) {
          parsed[key] = value;
          parsedLine.key = key;
          parsedLine.value = value;
        }

        if (commentParts.length > 0) {
          parsedLine.comment = commentParts.join("#").trim();
        }
      }
    }

    parsedLines.push(parsedLine);
  }

  return {
    parsed,
    raw: content,
    lines: parsedLines,
  };
}

function writeConfigFile(filePath: string, config: Record<string, any>): void {
  const content = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  fs.writeFileSync(filePath, content);
}

function execCommand(command: string, cwd: string): string {
  try {
    return execSync(command, { cwd, encoding: "utf8" });
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error);
    return "";
  }
}

export interface ConfigWithMetadata {
  appConfig: AppConfig;
  userPrefs: UserPreferences;
  rawConfigs: {
    app: string;
    user: string;
  };
}

export function loadConfig(): ConfigWithMetadata {
  if (!fs.existsSync(CONFIG_DIR_PATH)) {
    fs.mkdirSync(CONFIG_DIR_PATH, { recursive: true });
  }

  let appConfig: AppConfig = DEFAULT_APP_CONFIG;
  let userPrefs: UserPreferences = DEFAULT_USER_PREFS;
  let rawAppConfig = "";
  let rawUserConfig = "";
  try {
    if (fs.existsSync(APP_CONFIG_FILE_PATH)) {
      const appConfigData = parseConfigFile(APP_CONFIG_FILE_PATH);
      rawAppConfig = appConfigData.raw;
      appConfig = {
        ...DEFAULT_APP_CONFIG,
        logging: {
          level:
            (appConfigData.parsed["logging.level"]?.toUpperCase() as LogLevelType) ||
            DEFAULT_APP_CONFIG.logging.level,
          enabled: appConfigData.parsed["logging.enabled"] === "true" || DEFAULT_APP_CONFIG.logging.enabled,
          path: resolveHomeDir(appConfigData.parsed["logging.path"]) || DEFAULT_APP_CONFIG.logging.path,
          consoleOutputEnabled:
            appConfigData.parsed["logging.consoleOutputEnabled"] === "true" ||
            DEFAULT_APP_CONFIG.logging.consoleOutputEnabled,
        },
        model: appConfigData.parsed.model || DEFAULT_APP_CONFIG.model,
        contextWindowLimit:
          Number(appConfigData.parsed.contextWindowLimit) || DEFAULT_APP_CONFIG.contextWindowLimit,
      };
    } else {
      // Create default config with comments
      const defaultAppConfigContent = [
        "# AI Console Agent Application Configuration",
        "# Logging configuration",
        `logging.enabled=${DEFAULT_APP_CONFIG.logging.enabled}`,
        `logging.level=${DEFAULT_APP_CONFIG.logging.level}`,
        `logging.path=${DEFAULT_APP_CONFIG.logging.path}`,
        `logging.consoleOutputEnabled=${DEFAULT_APP_CONFIG.logging.consoleOutputEnabled}`,
        "# AI model to use for processing",
        `model=${DEFAULT_APP_CONFIG.model}`,
        "# Context limit for reducing costs",
        `contextWindowLimit=${DEFAULT_APP_CONFIG.contextWindowLimit}`,
      ].join("\n");

      fs.writeFileSync(APP_CONFIG_FILE_PATH, defaultAppConfigContent);
      rawAppConfig = defaultAppConfigContent;
    }

    if (fs.existsSync(USER_PREFS_FILE_PATH)) {
      const userPrefsData = parseConfigFile(USER_PREFS_FILE_PATH);
      rawUserConfig = userPrefsData.raw;
      userPrefs = {
        ...DEFAULT_USER_PREFS,
        techExpertiseLevel:
          parseInt(userPrefsData.parsed.techExpertiseLevel) || DEFAULT_USER_PREFS.techExpertiseLevel,
        preferredName: userPrefsData.parsed.preferredName,
      };
    } else {
      // Create default user preferences with comments
      const defaultUserPrefsContent = [
        `# User Preferences Configuration`,
        `# Technical expertise level (0.0 - 1.0)`,
        `techExpertiseLevel=${DEFAULT_USER_PREFS.techExpertiseLevel}`,
        `# Preferred name for interactions`,
        `preferredName=`,
      ].join("\n");

      fs.writeFileSync(USER_PREFS_FILE_PATH, defaultUserPrefsContent);
      rawUserConfig = defaultUserPrefsContent;
    }
  } catch (error) {
    console.error("Error loading config:", error);
  }

  console.log("Config loaded successfully", appConfig);

  return {
    appConfig,
    userPrefs,
    rawConfigs: {
      app: rawAppConfig,
      user: rawUserConfig,
    },
  };
}

export function saveConfig(appConfig: Partial<AppConfig>, userPrefs: Partial<UserPreferences>): boolean {
  const { appConfig: currentAppConfig, userPrefs: currentUserPrefs } = loadConfig();
  const newAppConfig = { ...currentAppConfig, ...appConfig };
  const newUserPrefs = { ...currentUserPrefs, ...userPrefs };

  try {
    writeConfigFile(APP_CONFIG_FILE_PATH, newAppConfig);
    writeConfigFile(USER_PREFS_FILE_PATH, newUserPrefs);
    return true;
  } catch (error) {
    console.error("Error saving config:", error);
    return false;
  }
}

function resolveHomeDir(filePath: string | undefined): string | undefined {
  if (!filePath) return undefined;
  return filePath.replace(/^~([^/]*)/, (match, p1) => (p1 ? path.join(os.homedir(), p1) : os.homedir()));
}
