import chalk from "chalk";

export function formatAgentMessage(message: string): string {
  const delimiter = "-------------------------------------------------------------------------------";
  return chalk.cyan(`AI Agent:\n\n${delimiter}\n\n${message}\n\n${delimiter}\n\n`);
}

export function formatAgentCommand(command: string): string {
  const delimiter = "-------------------------------------------------------------------------------";
  return chalk.yellow(`Agent Command:\n\n${delimiter}\n\n${command}\n\n${delimiter}\n\n`);
}

export function formatCommandOutput(output: string): string {
  const delimiter = "-------------------------------------------------------------------------------";
  return chalk.green(`Command Output:\n\n${delimiter}\n\n${output}\n\n${delimiter}\n\n`);
}

export function formatUserMessage(message: string): string {
  const delimiter = "-------------------------------------------------------------------------------";
  return chalk.blue(`User:\n\n${delimiter}\n\n${message}\n\n${delimiter}\n\n`);
}
