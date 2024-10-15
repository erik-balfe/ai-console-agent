import { input, password, select, Separator } from "@inquirer/prompts";
import { LogLevel } from "../utils/logger";

export function parseArguments(args: string[]): {
  input: string;
  resetKey: boolean;
  showHelp: boolean;
  setLogLevel?: LogLevel;
  getLogLevel: boolean;
} {
  const hasResetKey = args.includes("--reset-key");
  const hasHelp = args.includes("--help") || args.includes("-h");
  const getLogLevel = args.includes("--get-log-level");

  let setLogLevel: LogLevel | undefined;
  const logLevelArg = args.find(
    (arg) => arg.startsWith("--log-level=") || arg.startsWith("--set-log-level="),
  );
  if (logLevelArg) {
    const levelString = logLevelArg.split("=")[1].toUpperCase();
    setLogLevel = LogLevel[levelString as keyof typeof LogLevel];
  }

  const inputArgs = args.slice(2).filter((arg) => !arg.startsWith("--") && arg !== "-h");
  const userInput = inputArgs.join(" ");

  return {
    input: userInput,
    resetKey: hasResetKey,
    showHelp: hasHelp,
    setLogLevel,
    getLogLevel,
  };
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
      throw new Error("Task aborted by user");
    }

    return answer;
  } catch (error) {
    if (error instanceof Error && error.message === "Task aborted by user") {
      console.log("Task aborted by user.");
      process.exit(0);
    }
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
