import chalk from "chalk";

export function formatAgentMessage(message: string): string {
  const delimiter = "-------------------------------------------------------------------------------";
  return chalk.cyan(`AI Agent:\n\n${delimiter}\n\n${message}\n\n${delimiter}\n\n`);
}
