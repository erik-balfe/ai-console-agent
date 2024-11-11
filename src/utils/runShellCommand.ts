import { exec, type ExecOptions } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function runShellCommand(
  command: string,
  options?: ExecOptions,
): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execAsync(command, options);
    return {
      stdout: stdout.toString().trim(),
      stderr: stderr.toString().trim(),
    };
  } catch (error: any) {
    return {
      stderr: error instanceof Error ? error.message : String(error),
      stdout: "",
    };
  }
}
