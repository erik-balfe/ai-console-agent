import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const BLOCKED_COMMANDS = ["rm", "sudo", "su", "wget", "curl"];

export async function safeExecute(command: string): Promise<string> {
  const commandParts = command.split(" ");
  if (BLOCKED_COMMANDS.some((blocked) => commandParts[0].includes(blocked))) {
    throw new Error("Potentially dangerous command detected");
  }

  try {
    const { stdout } = await execAsync(command);
    return stdout.trim();
  } catch (error: unknown) {
    console.error("Error executing command:", error);
    throw new Error(
      `Failed to execute command safely: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
