import { input, password, select, Separator } from "@inquirer/prompts";
import chalk from "chalk";
import { LogLevel, LogLevelType } from "../utils/logger";

export interface ParsedArguments {
  input: string;
  resetKey: boolean;
  showHelp: boolean;
  setLogLevel?: LogLevelType;
  getLogLevel: boolean;
}

export function parseArguments(args: string[]): ParsedArguments {
  const parsedArgs: ParsedArguments = {
    input: "",
    resetKey: false,
    showHelp: false,
    getLogLevel: false,
  };

  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--reset-key":
        parsedArgs.resetKey = true;
        break;
      case "--help":
      case "-h":
        parsedArgs.showHelp = true;
        break;
      case "--get-log-level":
        parsedArgs.getLogLevel = true;
        break;
      default:
        if (arg.startsWith("--log-level=") || arg.startsWith("--set-log-level=")) {
          const levelString = arg.split("=")[1].toUpperCase() as keyof typeof LogLevel;
          if (LogLevel[levelString]) {
            parsedArgs.setLogLevel = levelString;
          } else {
            throw new Error(`Invalid log level '${levelString}'.`);
          }
        } else if (!arg.startsWith("--")) {
          parsedArgs.input += (parsedArgs.input ? " " : "") + arg;
        } else {
          throw new Error(`Unknown argument: ${arg}`);
        }
    }
  }

  return parsedArgs;
}

export function printHelp() {
  console.log(chalk.cyan("AI Console Agent Usage:"));
  console.log('  ai-console-agent [options] "<your command or question>"');
  console.log("\nOptions:");
  console.log("  --help, -h                  Show this help message");
  console.log("  --reset-key                 Delete the stored API key and prompt for a new one");
  console.log("  --log-level=<level>         Set the log level (DEBUG, INFO, WARN, ERROR)");
  console.log("  --get-log-level             Display the current log level");
  console.log("\nExamples:");
  console.log('  ai-console-agent "Show me the disk usage of the current directory"');
  console.log("  ai-console-agent --reset-key");
  console.log("  ai-console-agent --log-level=DEBUG");
  console.log("  ai-console-agent --get-log-level");
}

export async function displayOptionsAndGetInput(question: string, options: string[]): Promise<string> {
  const choices = [
    ...options.map((option) => ({ value: option, name: option })),
    new Separator(),
    { name: "Custom answer", value: "CUSTOM" },
    { name: "Abort the current task", value: "ABORT" },
  ];

  try {
    const answer = await select({
      message: question,
      choices: choices,
    });

    if (answer === "CUSTOM") {
      const customAnswer = await input({ message: "Enter your custom answer:" });
      return customAnswer;
    }

    if (answer === "ABORT") {
      return "<input_aborted_by_user />";
    }

    return answer;
  } catch (error) {
    console.error("Error during user interaction:", error);
    throw error;
  }
}

export async function getFreeformInput(prompt: string, isPassword: boolean = false): Promise<string> {
  if (isPassword) {
    return password({ message: prompt, mask: "*" });
  }
  return input({ message: prompt });
}
