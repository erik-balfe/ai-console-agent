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

// todo: change to be more user friendly, like a select with 2 lines where Yes is first
//  and focused by default, and no in second option.
//  And user would select option by using arrow buttons and enter.
export function getUserConfirmation(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`\x1b[33m${prompt} Press (y/n) and then press enter:\x1b[0m \n`, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}
