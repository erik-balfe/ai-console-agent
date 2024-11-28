import chalk from "chalk";
import { mkdir } from "fs/promises";
import { dirname } from "path";
import { DEFAULT_MAX_LOG_SIZE, LogLevel, LogLevelType } from "./constants";
import { LogContext, LoggerConfig } from "./types";

export class Logger {
  private static instance: Logger | null = null;
  private config: LoggerConfig;
  private context?: LogContext;
  private logFile?: string;
  private maxLogFileSize = DEFAULT_MAX_LOG_SIZE;

  private constructor(config: LoggerConfig) {
    this.config = config;
  }

  static async initialize(config: LoggerConfig): Promise<void> {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
      if (config.fileOutput?.enabled) {
        const logDir = dirname(config.fileOutput.path);
        await mkdir(logDir, { recursive: true });
        Logger.instance.logFile = config.fileOutput.path;
        await Bun.write(
          Bun.file(config.fileOutput.path),
          `=== Log file created/opened at ${new Date().toISOString()} ===\n`,
          { append: true },
        );
      }
    }
  }

  private static getInstance(): Logger {
    if (!Logger.instance) {
      throw new Error("Logger not initialized. Call Logger.initialize() first");
    }
    return Logger.instance;
  }

  private writeToFile(message: string): void {
    if (!this.logFile) return;

    try {
      const file = Bun.file(this.logFile);
      const stats = file.size;

      if (stats > this.maxLogFileSize) {
        const content = Bun.file(this.logFile).text();
        Promise.resolve(content).then((text) => {
          const lines = text.split("\n");
          const newContent = lines.slice(-DEFAULT_MAX_LOG_LINES).join("\n");
          Bun.write(Bun.file(this.logFile), newContent);
        });
      }

      Bun.write(Bun.file(this.logFile), message + "\n", { append: true });
    } catch (error) {
      console.error("Failed to write to log file:", error);
    }
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

  private shouldLog(level: LogLevelType, context?: LogContext): boolean {
    if (this.logLevelValue(level) < this.logLevelValue(this.config.level)) {
      return false;
    }

    if (!context) return true;

    if (this.config.enabledModules && context.module) {
      return this.config.enabledModules.includes(context.module);
    }

    if (this.config.enabledFeatures && context.feature) {
      return this.config.enabledFeatures.includes(context.feature);
    }

    return true;
  }

  private formatMessage(level: LogLevelType, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context
      ? Object.entries(context)
          .map(([key, value]) => `[${key}:${value}]`)
          .join(" ")
      : "";

    return `${timestamp} [${level}] ${contextStr} ${message}`;
  }

  private static log(level: LogLevelType, label: string, ...messages: any[]): void {
    const instance = Logger.getInstance();
    const color = chalk[this.getLabelColor(label)];

    if (!instance.shouldLog(level, instance.context)) return;

    const formattedMessages = messages
      .map((msg) => (typeof msg === "object" ? JSON.stringify(msg) : msg))
      .join(" ");

    const logMessage = instance.formatMessage(level, formattedMessages, instance.context);

    // Console output with color
    if (typeof color === "function") {
      console.log(color(logMessage));
    } else {
      console.log(logMessage);
    }

    // File output without color
    if (instance.config.fileOutput?.enabled) {
      instance.writeToFile(logMessage);
    }
  }

  private static getLabelColor(label: string): keyof typeof chalk {
    const colors: Record<string, keyof typeof chalk> = {
      CMD: "cyan",
      OUTPUT: "gray",
      AGENT: "green",
      USER: "magenta",
      ERROR: "red",
      WARN: "yellow",
      INFO: "blue",
      DEBUG: "gray",
    };
    return colors[label] || "white";
  }

  static debug(label: string, ...messages: any[]): void {
    Logger.log(LogLevel.DEBUG, label, ...messages);
  }

  static info(label: string, ...messages: any[]): void {
    Logger.log(LogLevel.INFO, label, ...messages);
  }

  static warn(label: string, ...messages: any[]): void {
    Logger.log(LogLevel.WARN, label, ...messages);
  }

  static error(label: string, ...messages: any[]): void {
    Logger.log(LogLevel.ERROR, label, ...messages);
  }

  static cmd(...messages: any[]): void {
    Logger.log(LogLevel.INFO, "CMD", ...messages);
  }

  static cmdOut(...messages: any[]): void {
    Logger.log(LogLevel.DEBUG, "OUTPUT", ...messages);
  }

  static agent(...messages: any[]): void {
    Logger.log(LogLevel.INFO, "AGENT", ...messages);
  }

  static user(...messages: any[]): void {
    Logger.log(LogLevel.INFO, "USER", ...messages);
  }
}

export const { debug, info, warn, error, cmd, cmdOut, agent, user } = Logger;
