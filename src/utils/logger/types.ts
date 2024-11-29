import { LogLevelType } from "./constants";

export interface LogContext {
  module?: string;
  feature?: string;
  [key: string]: string | undefined;
}

export interface LoggerConfig {
  level: LogLevelType;
  enabledModules?: string[];
  enabledFeatures?: string[];
  fileOutput?: {
    enabled: boolean;
    path: string;
  };
  consoleOutputEnabled?: boolean; // New field
}

export interface LogEntry {
  timestamp: string;
  level: LogLevelType;
  message: string;
  context?: LogContext;
}
