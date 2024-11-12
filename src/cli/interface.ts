import { input, password, select, Separator } from "@inquirer/prompts";
import chalk from "chalk";
import { AVAILABLE_MODELS } from "../constants";
import { LogLevel, LogLevelType } from "../utils/logger";
import { resolveModelId } from "../utils/modelUtils";

export interface ParsedArguments {
  input: string;
  resetKey: boolean;
  showHelp: boolean;
  setLogLevel?: LogLevelType;
  getLogLevel: boolean;
  model?: string;
  showKeys: boolean;
}
export function parseArguments(args: string[]): ParsedArguments {
  const parsedArgs: ParsedArguments = {
    input: "",
    resetKey: false,
    showHelp: false,
    getLogLevel: false,
    showKeys: false,
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
        parsedArgs.showKeys = true;
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

  console.log("\nAvailable Models:");

  // GPT-4 Models
  console.log("  GPT-4 Models:");
  console.log(
    `    gpt4oMini (${AVAILABLE_MODELS.gpt4oMini})   - Smaller, faster GPT-4 | Price: $0.26/1M tokens`,
  );
  console.log(`    gpt4 (${AVAILABLE_MODELS.gpt4})             - Full GPT-4 | Price: $4.38/1M tokens`);

  // Claude Models
  console.log("  Claude Models:");
  console.log(
    `    claude35Sonnet (${AVAILABLE_MODELS.claude35Sonnet}) - Best Claude model | Price: $6.00/1M tokens`,
  );
  console.log(
    `    claude35Haiku (${AVAILABLE_MODELS.claude35Haiku})   - Fast, efficient Claude | Price: $2.00/1M tokens (Default Model)`,
  );

  // Other Models
  console.log("  Other Models:");
  console.log(
    `    llama (${AVAILABLE_MODELS.llama}) - Llama model via Groq. Fastest one | Price: $0.64/1M tokens`,
  );

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
    { name: "Exit", value: "ABORT" },
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
