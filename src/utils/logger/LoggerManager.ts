// src/utils/logger/loggerManager.ts
import { Logger, LoggerConfig } from "./index";

let loggerInstance: Logger | null = null;

export async function initializeLogger(config: LoggerConfig): Promise<Logger> {
  if (!loggerInstance) {
    loggerInstance = await Logger.getInstance(config);
  }
  return loggerInstance;
}

export function getLogger(): Logger {
  if (!loggerInstance) {
    throw new Error("Logger not initialized. Call initializeLogger first.");
  }
  return loggerInstance;
}
