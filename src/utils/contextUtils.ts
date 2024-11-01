import { runShellCommand } from "./runShellCommand";

export interface ContextData {
  pwdOutput: string;
  lsOutput: string;
  // Future properties can be added easily here
}

export async function gatherContextData(): Promise<ContextData> {
  const pwdOutput = await runShellCommand("pwd", { shell: "bash" }).then(({ stdout }) => stdout);
  const lsOutput = await runShellCommand("ls -la", { shell: "bash" }).then(({ stdout }) => stdout);

  return {
    pwdOutput,
    lsOutput,
  };
}
