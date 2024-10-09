import { exec, type ExecOptions } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function runShellCommand(
  command: string,
  options?: ExecOptions,
): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execAsync(command, options);
    return { stdout, stderr };
  } catch (error: any) {
    console.error(`Error executing command: ${command}`, error);
    throw new Error(
      `Failed to execute command safely: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
