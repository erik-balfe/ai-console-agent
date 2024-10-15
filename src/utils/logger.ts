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

  debug(message: string) {
    if (this.currentLevel <= LogLevel.DEBUG) {
      console.log(chalk.gray(`[DEBUG] ${message}`));
    }
  }

  info(message: string) {
    if (this.currentLevel <= LogLevel.INFO) {
      console.log(chalk.blue(`[INFO] ${message}`));
    }
  }

  warn(message: string) {
    if (this.currentLevel <= LogLevel.WARN) {
      console.log(chalk.yellow(`[WARN] ${message}`));
    }
  }

  error(message: string) {
    if (this.currentLevel <= LogLevel.ERROR) {
      console.log(chalk.red(`[ERROR] ${message}`));
    }
  }

  command(command: string) {
    if (this.currentLevel <= LogLevel.INFO) {
      console.log(chalk.cyan(`[COMMAND] ${command}`));
    }
  }

  commandOutput(output: string) {
    if (this.currentLevel <= LogLevel.DEBUG) {
      console.log(chalk.gray(`[OUTPUT] ${output}`));
    }
  }

  agentResponse(response: string) {
    console.log(chalk.green(`[AGENT] ${response}`));
  }

  userInteraction(message: string) {
    console.log(chalk.magenta(`[USER] ${message}`));
  }
}

export const logger = Logger.getInstance();
