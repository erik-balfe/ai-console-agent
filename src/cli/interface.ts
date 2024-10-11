import { input, select, Separator } from "@inquirer/prompts";
import { stdin } from "process";

export function parseArguments(args: string[]): { input: string } {
  console.log("### Parsing arguments:", args);

  // Skip the first two arguments (node executable and script path)
  const userInput = args.slice(2).join(" ");

  console.log("### User input:", userInput);

  const result = {
    input: userInput,
  };

  console.log("### Parsed input:", result);
  return result;
}

export async function getPipedInput(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    stdin.on("readable", () => {
      let chunk;
      while (null !== (chunk = stdin.read())) {
        data += chunk;
      }
    });
    stdin.on("end", () => {
      resolve(data.trim());
    });
  });
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

export async function getFreeformInput(prompt: string): Promise<string> {
  return input({ message: prompt });
}
