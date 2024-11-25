import { exec, spawn, type ExecOptions } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { logger } from "./logger";

const execAsync = promisify(exec);

export interface ShellCommandResult {
  stdout: string;
  stderr: string;
  warnings?: string[];
  error?: {
    code: number;
    signal?: string;
    message: string;
  };
  isAsync?: boolean;
  outputFiles?: {
    stdout: string;
    stderr: string;
    combined: string;
  };
}

export interface EnhancedExecOptions extends ExecOptions {
  timeout?: number;
  maxBuffer?: number;
  enforceUtf8?: boolean;
  async?: boolean;
  runDir?: string;
}

const DEFAULT_OPTIONS: EnhancedExecOptions = {
  shell: "/bin/bash",
  timeout: 30000,
  maxBuffer: 1024 * 1024 * 10,
  enforceUtf8: true,
  async: false,
  env: {
    ...process.env,
    LANG: "en_US.UTF-8",
    LC_ALL: "en_US.UTF-8",
  },
};

export async function runShellCommand(
  command: string,
  options: EnhancedExecOptions = {},
): Promise<ShellCommandResult> {
  const finalOptions = { ...DEFAULT_OPTIONS, ...options };
  logger.debug("command in runShellCommand", command);

  if (!finalOptions.async) {
    try {
      const wrappedCommand = `
        set -euo pipefail
        ${command}
      `;
      logger.debug(`Executing command: ${wrappedCommand}`);
      const { stdout, stderr } = await execAsync(wrappedCommand, finalOptions);
      return {
        stdout: stdout.toString().trim(),
        stderr: stderr.toString().trim(),
      };
    } catch (error) {}
  }

  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const baseFileName = `cmd_${timestamp}_${randomSuffix}`;
  const outputDir = path.join(finalOptions.runDir || "/tmp/ai-console-agent", "commands", baseFileName);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFiles = {
    stdout: path.join(outputDir, "stdout.log"),
    stderr: path.join(outputDir, "stderr.log"),
    combined: path.join(outputDir, "combined.log"),
  };

  const stdoutStream = fs.createWriteStream(outputFiles.stdout);
  const stderrStream = fs.createWriteStream(outputFiles.stderr);
  const combinedStream = fs.createWriteStream(outputFiles.combined);

  fs.writeFileSync(
    path.join(outputDir, "metadata.json"),
    JSON.stringify({
      command: command,
      startTime: timestamp,
      options: finalOptions,
    }),
  );

  const process = spawn("/bin/bash", ["-c", command], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  process.stdout.on("data", (data) => {
    const output = data.toString();
    stdoutStream.write(output);
    combinedStream.write(output);
  });

  process.stderr.on("data", (data) => {
    const output = data.toString();
    stderrStream.write(output);
    combinedStream.write(`[stderr] ${output}`);
  });

  fs.writeFileSync(path.join(outputDir, "pid"), process.pid!.toString());

  return {
    stdout: "",
    stderr: "",
    isAsync: true,
    outputFiles,
  };
}
