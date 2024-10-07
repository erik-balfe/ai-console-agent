import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function runShellCommand(command: string): Promise<{ stdout: string; stderr: string }> {
  console.log("Executing command1:", command);
  try {
    const { stdout, stderr } = await execAsync(command);
    return { stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error: unknown) {
    if (error instanceof Error && "stderr" in error) {
      return { stdout: "", stderr: "" };
    }
    console.error("Error executing command:", error);
    throw new Error(
      `Failed to execute command safely: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
