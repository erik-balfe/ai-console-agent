import { runShellCommand } from "../utils/runShellCommand";

export interface DynamicContextData {
  pwdOutput: string;
  lsOutput: string;
  time: string;
}

export async function gatherContextData(): Promise<DynamicContextData> {
  const pwdOutput = await runShellCommand("pwd", { shell: "bash" }).then(({ stdout }) => stdout);
  const lsOutput = await runShellCommand("ls -la", { shell: "bash" }).then(({ stdout }) => stdout);
  const currentDate = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return {
    pwdOutput,
    lsOutput,
    time: currentDate,
  };
}
