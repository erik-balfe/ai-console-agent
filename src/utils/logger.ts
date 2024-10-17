import chalk from "chalk";

export const LogLevel = {
  DEBUG: "DEBUG" as const,
  INFO: "INFO" as const,
  WARN: "WARN" as const,
  ERROR: "ERROR" as const,
};

export type LogLevelType = (typeof LogLevel)[keyof typeof LogLevel];

export class Logger {
  private static instance: Logger;
  private currentLevel: LogLevelType = LogLevel.INFO; // Default level

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  getLevel(): LogLevelType {
    return this.currentLevel;
  }

  setLevel(level: LogLevelType) {
    this.currentLevel = level;
  }

  private logLevelValue(level: LogLevelType): number {
    const levels = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3,
    };
    return levels[level];
  }

  private log(level: LogLevelType, color: (str: string) => string, tag: string, ...messages: any[]) {
    if (this.logLevelValue(this.currentLevel) <= this.logLevelValue(level)) {
      const formattedMessages = messages
        .map((msg) => (typeof msg === "object" ? JSON.stringify(msg) : msg))
        .join(" ");
      console.log(color(`[${tag}] ${formattedMessages}`));
    }
  }

  debug(...messages: any[]) {
    this.log(LogLevel.DEBUG, chalk.gray, LogLevel.DEBUG, ...messages);
  }

  info(...messages: any[]) {
    this.log(LogLevel.INFO, chalk.blue, LogLevel.INFO, ...messages);
  }

  warn(...messages: any[]) {
    this.log(LogLevel.WARN, chalk.yellow, LogLevel.WARN, ...messages);
  }

  error(...messages: any[]) {
    this.log(LogLevel.ERROR, chalk.red, LogLevel.ERROR, ...messages);
  }

  command(...messages: any[]) {
    this.log(LogLevel.INFO, chalk.cyan, "COMMAND", ...messages);
  }

  commandOutput(...messages: any[]) {
    this.log(LogLevel.DEBUG, chalk.gray, "OUTPUT", ...messages);
  }

  agentResponse(...messages: any[]) {
    this.log(LogLevel.INFO, chalk.green, "AGENT", ...messages);
  }

  userInteraction(...messages: any[]) {
    this.log(LogLevel.INFO, chalk.magenta, "USER", ...messages);
  }
}

export const logger = Logger.getInstance();
