import chalk from "chalk";
import { mkdir } from "fs/promises";
import { dirname } from "path";
import { DEFAULT_MAX_LOG_LINES, DEFAULT_MAX_LOG_SIZE, LogLevel, LogLevelType } from "./constants";
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

  private static log(level: LogLevelType, label: string, message: string, context?: LogContext): void {
    const instance = Logger.getInstance();

    if (!instance.shouldLog(level, context)) return;

    const logMessage = instance.formatMessage(level, message, context);

    // Console output with color
    if (instance.config.consoleOutputEnabled) {
      const color = chalk[Logger.getLabelColor(level)];
      if (typeof color === "function") {
        console.log(color(logMessage), "", "");
      } else {
        console.log(logMessage, "", "");
      }
    }

    // File output without color
    if (instance.config.fileOutput?.enabled) {
      instance.writeToFile(logMessage);
    }
  }

  private static getLabelColor(level: LogLevelType): keyof typeof chalk {
    const colors: Record<LogLevelType, keyof typeof chalk> = {
      [LogLevel.DEBUG]: "gray",
      [LogLevel.INFO]: "blue",
      [LogLevel.WARN]: "yellow",
      [LogLevel.ERROR]: "red",
    };
    return colors[level];
  }

  static debug(...args: any[]): void {
    Logger.processLogCall(LogLevel.DEBUG, ...args);
  }

  static info(...args: any[]): void {
    Logger.processLogCall(LogLevel.INFO, ...args);
  }

  static warn(...args: any[]): void {
    Logger.processLogCall(LogLevel.WARN, ...args);
  }

  static error(...args: any[]): void {
    Logger.processLogCall(LogLevel.ERROR, ...args);
  }

  static cmd(...args: any[]): void {
    Logger.processLogCall(LogLevel.INFO, "CMD", ...args);
  }

  static cmdOut(...args: any[]): void {
    Logger.processLogCall(LogLevel.DEBUG, "OUTPUT", ...args);
  }

  static agent(...args: any[]): void {
    Logger.processLogCall(LogLevel.INFO, "AGENT", ...args);
  }

  static user(...args: any[]): void {
    Logger.processLogCall(LogLevel.INFO, "USER", ...args);
  }

  private static processLogCall(level: LogLevelType, ...args: any[]): void {
    if (args.length === 1 && typeof args[0] === "string") {
      Logger.log(level, "DEFAULT", args[0]);
    } else if (args.length === 2 && typeof args[0] === "string" && typeof args[1] === "string") {
      Logger.log(level, args[0], args[1]);
    } else if (args.length === 1 && typeof args[0] === "object" && args[0].label && args[0].message) {
      Logger.log(level, args[0].label, args[0].message, args[0].context);
    } else if (args.length === 1 && typeof args[0] === "object" && args[0].message) {
      Logger.log(level, "DEFAULT", args[0].message, args[0].context);
    } else {
      Logger.log(level, "DEFAULT", args.map((arg) => JSON.stringify(arg)).join(" "));
    }
  }
}

export const { debug, info, warn, error, cmd, cmdOut, agent, user } = Logger;
