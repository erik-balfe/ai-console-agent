import { dateToReadableFormat } from "../utils/dateToReadableFormat";
import { runShellCommand } from "../utils/runShellCommand";

export interface DynamicContextData {
  pwdOutput: string;
  lsOutput: string;
  time: string;
}

export async function gatherContextData(): Promise<DynamicContextData> {
  const pwdOutput = await runShellCommand("pwd", { shell: "bash" }).then(({ stdout }) => stdout);
  const lsOutput = await runShellCommand("ls -la", { shell: "bash" }).then(({ stdout }) => stdout);
  const currentDate = dateToReadableFormat(new Date());
  return {
    pwdOutput,
    lsOutput,
    time: currentDate,
  };
}
