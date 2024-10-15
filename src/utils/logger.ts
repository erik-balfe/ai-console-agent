import chalk from "chalk";

export enum LogLevel {
  DEBUG,
  INFO,
  WARN,
  ERROR,
}

export class Logger {
  private static instance: Logger;
  private currentLevel: LogLevel = LogLevel.INFO;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  getLevel(): LogLevel {
    return this.currentLevel;
  }

  setLevel(level: LogLevel) {
    this.currentLevel = level;
  }

  private log(level: LogLevel, color: chalk.ChalkFunction, tag: string, ...messages: any[]) {
    if (this.currentLevel <= level) {
      const formattedMessages = messages
        .map((msg) => (typeof msg === "object" ? JSON.stringify(msg) : msg))
        .join(" ");
      console.log(color(`[${tag}] ${formattedMessages}`));
    }
  }

  debug(...messages: any[]) {
    this.log(LogLevel.DEBUG, chalk.gray, "DEBUG", ...messages);
  }

  info(...messages: any[]) {
    this.log(LogLevel.INFO, chalk.blue, "INFO", ...messages);
  }

  warn(...messages: any[]) {
    this.log(LogLevel.WARN, chalk.yellow, "WARN", ...messages);
  }

  error(...messages: any[]) {
    this.log(LogLevel.ERROR, chalk.red, "ERROR", ...messages);
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
