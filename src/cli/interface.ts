import { stdin } from "process";
import readline from "readline";

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

export function getUserConfirmation(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${prompt}\n\nPress (y/n) and then press enter:`, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}
