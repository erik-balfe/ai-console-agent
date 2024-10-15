import chalk from "chalk";

export function formatUserMessage(message: string): string {
  return chalk.cyan("AI Agent: ") + message;
}
