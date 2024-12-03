export const LogLevel = {
  DEBUG: "DEBUG" as const,
  INFO: "INFO" as const,
  WARN: "WARN" as const,
  ERROR: "ERROR" as const,
};

export type LogLevelType = (typeof LogLevel)[keyof typeof LogLevel];

export const DEFAULT_MAX_LOG_SIZE = 100 * 1024 * 1024; // 100MB
export const DEFAULT_MAX_LOG_LINES = 80000;
