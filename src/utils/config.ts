import { execSync } from "child_process";
import fs from "fs";
import { APP_CONFIG_FILE_PATH, CONFIG_DIR_PATH, MODELS, USER_PREFS_FILE_PATH } from "../constants";
import { LogLevel, LogLevelType } from "./logger";

export interface AppConfig {
  logLevel: LogLevelType;
  model: string;
  // ... other app settings,
}

export interface UserPreferences {
  techExpertiseLevel: number;
  preferredName?: string;
  // ... other user preferences
}

const DEFAULT_APP_CONFIG: AppConfig = {
  logLevel: LogLevel.WARN,
  model: Object.values(MODELS).find((model) => model.default)?.id || "",
};

const DEFAULT_USER_PREFS: UserPreferences = {
  techExpertiseLevel: 2,
};

function parseConfigFile(filePath: string): Record<string, string> {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const config: Record<string, string> = {};

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith("#")) {
      const [key, value] = trimmedLine.split("=").map((part) => part.trim());
      if (key && value) {
        config[key] = value;
      }
    }
  }

  return config;
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

// function initGitRepo() {
//   if (!fs.existsSync(path.join(CONFIG_DIR_PATH, ".git"))) {
//     execCommand("git init", CONFIG_DIR_PATH);
//     execCommand("git add APP_CONFIG_FILE_PATH", CONFIG_DIR_PATH);
//     execCommand("git add USER_PREFS_FILE_PATH", CONFIG_DIR_PATH);
//     execCommand('git commit -m "Initial commit"', CONFIG_DIR_PATH);
//   }
// }

// function commitChanges(message: string): boolean {
//   try {
//     execCommand("git add APP_CONFIG_FILE_PATH", CONFIG_DIR_PATH);
//     execCommand("git add USER_PREFS_FILE_PATH", CONFIG_DIR_PATH);
//     execCommand(`git commit -m "${message}"`, CONFIG_DIR_PATH);
//     return true;
//   } catch (error) {
//     console.error("Failed to commit changes:", error);
//     return false;
//   }
// }

// function getLastCommitHash(): string {
//   return execCommand("git rev-parse HEAD", CONFIG_DIR_PATH).trim();
// }

// export function revertLastChange(): boolean {
//   try {
//     const lastCommitHash = getLastCommitHash();
//     execCommand(`git revert --no-commit ${lastCommitHash}`, CONFIG_DIR_PATH);
//     execCommand('git commit -m "Revert last change due to config issue"', CONFIG_DIR_PATH);
//     return true;
//   } catch (error) {
//     console.error("Failed to revert last change:", error);
//     return false;
//   }
// }

export function loadConfig(): { appConfig: AppConfig; userPrefs: UserPreferences } {
  if (!fs.existsSync(CONFIG_DIR_PATH)) {
    fs.mkdirSync(CONFIG_DIR_PATH, { recursive: true });
  }

  let appConfig: AppConfig = DEFAULT_APP_CONFIG;
  let userPrefs: UserPreferences = DEFAULT_USER_PREFS;

  try {
    if (fs.existsSync(APP_CONFIG_FILE_PATH)) {
      const parsedConfig = parseConfigFile(APP_CONFIG_FILE_PATH);
      appConfig = {
        ...DEFAULT_APP_CONFIG,
        logLevel:
          (parsedConfig.logLevel.toUpperCase() as LogLevelType) || DEFAULT_APP_CONFIG.logLevel.toUpperCase(),
        model: parsedConfig.model || DEFAULT_APP_CONFIG.model,
      };
    } else {
      writeConfigFile(APP_CONFIG_FILE_PATH, DEFAULT_APP_CONFIG);
    }

    if (fs.existsSync(USER_PREFS_FILE_PATH)) {
      const parsedPrefs = parseConfigFile(USER_PREFS_FILE_PATH);
      userPrefs = {
        ...DEFAULT_USER_PREFS,
        techExpertiseLevel: parseInt(parsedPrefs.techExpertiseLevel) || DEFAULT_USER_PREFS.techExpertiseLevel,
        preferredName: parsedPrefs.preferredName,
      };
    } else {
      writeConfigFile(USER_PREFS_FILE_PATH, DEFAULT_USER_PREFS);
    }

    // initGitRepo();
  } catch (error) {
    console.error("Error loading config:", error);
    // If there's an error, use default configs
  }

  return { appConfig, userPrefs };
}

export function saveConfig(appConfig: Partial<AppConfig>, userPrefs: Partial<UserPreferences>): boolean {
  const { appConfig: currentAppConfig, userPrefs: currentUserPrefs } = loadConfig();
  const newAppConfig = { ...currentAppConfig, ...appConfig };
  const newUserPrefs = { ...currentUserPrefs, ...userPrefs };

  try {
    writeConfigFile(APP_CONFIG_FILE_PATH, newAppConfig);
    writeConfigFile(USER_PREFS_FILE_PATH, newUserPrefs);

    // if (commitChanges("Update config and preferences")) {
    return true;
    // } else {
    //   console.warn("Failed to commit changes. Rolling back...");
    //   revertLastChange();
    //   return false;
    // }
  } catch (error) {
    console.error("Error saving config:", error);
    return false;
  }
}
