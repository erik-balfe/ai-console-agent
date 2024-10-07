import { stdin } from "process";
import readline from "readline";

export function parseArguments(args: string[]): { command: string | null; input: string } {
  console.log("Parsing arguments:", args);

  const [, , ...cliArgs] = args;
  const joined = cliArgs.join(" ");

  console.log("Joined CLI arguments:", joined);

  if (joined.includes("|")) {
    const [command, ...rest] = joined.split("|");
    const result = {
      command: command.trim(),
      input: rest.join("|").trim(),
    };
    console.log("Parsed piped command:", result);
    return result;
  } else {
    const result = {
      command: null,
      input: joined.trim(),
    };
    console.log("Parsed direct input:", result);
    return result;
  }
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
    rl.question(`${prompt} (y/n) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}
