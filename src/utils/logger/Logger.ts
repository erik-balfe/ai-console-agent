import { mkdir } from "fs/promises";
import { dirname, resolve } from "path";
import pino from "pino";
import { DEFAULT_MAX_LOG_SIZE, LogLevel, LogLevelType } from "./constants";
import { LogContext, LoggerConfig } from "./types";
import chalk from "chalk";

export class Logger {
  private static instance: Logger | null = null;
  private config: LoggerConfig;
  private context?: LogContext;
  private logger?: pino.Logger;
  private logFile?: string;
  private maxLogFileSize = DEFAULT_MAX_LOG_SIZE;

  private constructor(config: LoggerConfig) {
    this.config = config;
  }

  static async initialize(config: LoggerConfig): Promise<void> {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
      if (config.fileOutput?.enabled) {
        const logDir = dirname(resolve(config.fileOutput.path));
        await mkdir(logDir, { recursive: true });
        Logger.instance.logFile = resolve(config.fileOutput.path);
        Logger.instance.logger = pino({
          level: config.level,
          transport: {
            target: "pino/file",
            options: {
              destination: Logger.instance.logFile,
              sync: true, // Synchronous writing
            },
          },
          serializers: {
            context: (ctx) => {
              return ctx
                ? Object.entries(ctx).reduce(
                    (acc, [key, value]) => {
                      acc[key] = value;
                      return acc;
                    },
                    {} as Record<string, any>,
                  )
                : undefined;
            },
          },
        });
      }
    }
  }

  private static getInstance(): Logger {
    if (!Logger.instance) {
      throw new Error("Logger not initialized. Call Logger.initialize() first");
    }
    return Logger.instance;
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
        console.log(color(logMessage));
      } else {
        console.log(logMessage);
      }
    }

    // File output without color
    if (instance.config.fileOutput?.enabled && instance.logger) {
      instance.logger[level.toLowerCase()](message, { context, label });
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
