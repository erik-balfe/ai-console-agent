// ai-console-agent/src/cli/interface.ts (partial)

import { input, password, select, Separator } from "@inquirer/prompts";
import chalk from "chalk";
import { MODELS } from "../constants";
import { LogLevel, LogLevelType } from "../utils/logger";
import { resolveModelId } from "../utils/modelUtils";

export interface ParsedArguments {
  input: string;
  resetKey: boolean;
  showHelp: boolean;
  logToFile?: boolean;
  logPath?: string;
  logLevel?: LogLevelType;
  model?: string;
  showAPIKeys: boolean;
  newConversation: boolean;
}
export function parseArguments(args: string[]): ParsedArguments {
  const parsedArgs: ParsedArguments = {
    input: "",
    resetKey: false,
    showHelp: false,
    logToFile: undefined,
    logPath: undefined,
    logLevel: undefined,
    showAPIKeys: false,
    newConversation: false,
  };

  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--reset-api-key":
        parsedArgs.resetKey = true;
        break;
      case "--help":
      case "-h":
        parsedArgs.showHelp = true;
        break;
      case "--show-keys":
        parsedArgs.showAPIKeys = true;
        break;
      case "--new-chat":
        parsedArgs.newConversation = true;
        break;
      case "--log-to-file":
        parsedArgs.logToFile = true;
        break;
      default:
        if (arg.startsWith("--log-level=")) {
          const levelString = arg.split("=")[1].toUpperCase() as keyof typeof LogLevel;
          if (LogLevel[levelString]) {
            parsedArgs.logLevel = LogLevel[levelString];
          } else {
            throw new Error(`Invalid log level '${levelString}'`);
          }
        } else if (arg.startsWith("--log-path=")) {
          parsedArgs.logPath = arg.split("=")[1];
        } else if (arg.startsWith("--model=")) {
          const modelInput = arg.split("=")[1];
          try {
            parsedArgs.model = resolveModelId(modelInput);
          } catch (error) {
            if (error instanceof Error) {
              throw new Error(`Model argument error: ${error.message}`);
            }
            throw error;
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
  console.log("  --model=<model>             Set the AI model to use (can be model ID or shortname)");
  console.log("  --show-keys                 Display stored API keys in a safe format");
  console.log("  --new-chat                  Start a new chat");

  console.log(chalk.yellow("\n# Available Models:"));

  const categories = {
    OpenAI: ["gpt-4o-mini", "gpt-4o"],
    Anthropic: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"],
    "USA open weights": ["llama3-groq-70b-8192-tool-use-preview"],
    "Chinese open weights": ["Qwen/Qwen2.5-Coder-32B-Instruct", "Qwen/QwQ-32B-Preview"],
  };

  for (const [category, modelIds] of Object.entries(categories)) {
    console.log(`  ${category} Models:`);
    for (const modelId of modelIds) {
      const model = MODELS[modelId];
      console.log(
        `    ${model.friendlyName} (${model.id}) - ${model.description} | Price: ${model.priceDesc}`,
      );
    }
    console.log("");
  }

  // Examples section remains the same as it doesn't reference specific models
  console.log("\nExamples:");
  console.log(chalk.yellow("# Interactive Mode (no query provided):"));
  console.log("  ai-console-agent");
  console.log("  → Launches interactive mode where you can type your query");

  console.log(chalk.yellow("\n# Basic Usage:"));
  console.log('  ai-console-agent "Show me the disk usage of the current directory"');
  console.log("  → Executes system command and explains the results");

  console.log(chalk.yellow("\n# Using Specific Model:"));
  console.log(`  ai-console-agent --model=gpt4oMini "Write a test for this function"`);
  console.log("  → Uses faster GPT-4 model for code-related tasks");

  console.log(chalk.yellow("\n# Configuration:"));
  console.log("  ai-console-agent --reset-key");
  console.log("  → Resets the API key and prompts for a new one");

  console.log(chalk.yellow("\n# Debugging:"));
  console.log("  ai-console-agent --log-level=DEBUG");
  console.log("  → Sets verbose logging for troubleshooting");
  console.log("  ai-console-agent --get-log-level");
  console.log("  → Shows current logging verbosity");
}

// todo: fix after moving to another cli for itecraccation with user
export async function displayOptionsAndGetInput(
  question: string,
  options: string[],
  withoutFreeAnswer: boolean = false,
): Promise<string> {
  const choices = [
    ...options.map((option) => ({ value: option, name: option })),
    new Separator(),
    { name: "Custom answer", value: "CUSTOM" },
    { name: "cancel", value: "ABORT" },
    { name: "Exit program", value: "EXIT_PROGRAM" },
  ];

  try {
    if (withoutFreeAnswer) {
      return await input({ message: question });
    }

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

    if (answer === "EXIT_PROGRAM") {
      return "<exit />";
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
