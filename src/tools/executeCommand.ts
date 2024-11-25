import chalk from "chalk";
import { FunctionTool } from "llamaindex";
import path from "path";
import { displayOptionsAndGetInput } from "../cli/interface";
import { CONTEXT_ALLOCATION, ContextAllocationItem } from "../constants";
import { Database } from "../utils/database";
import { logger } from "../utils/logger";
import { runShellCommand } from "../utils/runShellCommand";
import { createToolMiddleware } from "./toolMiddleware";

interface ExecuteCommandParams {
  command: string;
  requireConfirmation?: {
    enabled?: boolean;
    description?: string;
  };
  async?: boolean;
}

interface CommandResponse {
  stdout?: string;
  stderr?: string;
  truncated?: boolean;
  truncatedDetails?: {
    lines: number;
    characters: number;
  };
  error?: {
    code: number;
    message: string;
  };
  // New async-specific fields
  isAsync?: boolean;
  outputFiles?: {
    stdout: string;
    stderr: string;
    combined: string;
  };
}

export const executeCommandCallback = async (params: ExecuteCommandParams): Promise<string> => {
  const {
    command,
    requireConfirmation: { enabled, description: explanation } = { enabled: false, description: "" },
    async = false,
  } = params;

  if (enabled) {
    if (!explanation) {
      throw new Error("requireConfirmation.description is required when requireConfirmation.enabled is true");
    }

    const confirmationQuestion = chalk.blue(
      `\n\n${explanation}.\nDo you want to execute this command:\n\n>${command}\n`,
    );

    const userChoice = await displayOptionsAndGetInput(confirmationQuestion, ["Yes", "No"]);
    if (userChoice === "No") {
      return "Command execution cancelled by user.";
    }
  }

  try {
    const result = await runShellCommand(command, {
      timeout: async ? undefined : 60000, // No timeout for async commands
      maxBuffer: 1024 * 1024 * 50,
      async,
      runDir: process.env.SCRATCH_SPACE || path.join("/tmp", "ai-console-agent"),
    });

    logger.info(`Agent run command${async ? " (async)" : ""}:\n${command}\n`);

    if (async) {
      const response: CommandResponse = {
        isAsync: true,
        outputFiles: result.outputFiles,
      };
      return JSON.stringify(response);
    }

    // Handle synchronous execution result
    if (result.error) {
      logger.error(`Command failed with code ${result.error.code}: ${result.error.message}`);
    }

    const truncatedResult = truncateCommandOutput(
      result.stdout || result.stderr,
      CONTEXT_ALLOCATION.toolOutput,
    );

    const response: CommandResponse = {
      ...result,
      truncated: typeof truncatedResult !== "string",
      stdout: typeof truncatedResult === "string" ? truncatedResult : truncatedResult.output,
      truncatedDetails: typeof truncatedResult !== "string" ? truncatedResult.truncatedDetails : undefined,
    };

    logger.debug("truncated output:", response.stdout);
    logger.info(`Agent got command output:\n${response.stdout}\n`);

    return JSON.stringify(response);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Failed to execute command: ${errorMessage}`;
  }
};

export function createExecuteCommandTool(db: Database, conversationId: number) {
  const wrappedCallback = createToolMiddleware(db, conversationId)("executeCommand", executeCommandCallback);

  return new FunctionTool<ExecuteCommandParams, Promise<string>>(wrappedCallback, {
    name: "bash",
    description: `Execute a shell command on the user's host system in a dedicated terminal session. Session is separated from user's current shell session.

Key Features:
- Supports both synchronous and asynchronous execution
- Async mode writes output to separate files for stdout, stderr, and combined output
- Output limited to ${CONTEXT_ALLOCATION.toolOutput.maxChars} characters for synchronous execution
- Interactive commands (e.g. 'git commit' requiring editor) are not supported

Usage Guidelines:
- For long-running commands, use async=true
- Async commands return file paths for monitoring progress
- Use tail, grep, etc. to monitor async command output
- Use Scratch Space for intermediate results
- Break complex pipelines into steps for better manageability

Returns: JSON object containing:
- For sync commands: stdout, stderr, and execution details
- For async commands: output file paths for monitoring
`,
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The command to execute",
        },
        requireConfirmation: {
          type: "object",
          properties: {
            enabled: {
              type: "boolean",
              description: "If true, requires explicit user confirmation before executing the command.",
            },
            description: {
              type: "string",
              description:
                "Description of the command, shown to user before confirmation. Required if requireConfirmation is true.",
            },
          },
        },
        async: {
          type: "boolean",
          description:
            "If true, executes command asynchronously and returns file paths for monitoring progress.",
        },
      },
      required: ["command"],
    },
  });
}

export function formatShortOutput(longText: string, numLines: number = 2, assumedLineLength: number = 100) {
  const lines = longText.split("\n");
  if (lines.length > 1) {
    const firstNLines = lines.slice(0, numLines).join("\n");
    const lastNLines = lines.slice(-numLines).join("\n");
    return `${firstNLines}\n...[TRUNCATED]...\n${lastNLines}`;
  } else {
    return `${longText.slice(0, assumedLineLength)}...[TRUNCATED]...${longText.slice(-assumedLineLength)}`;
  }
}

function truncateCommandOutput(
  output: string,
  limits: ContextAllocationItem,
): string | { output: string; truncatedDetails: { lines: number; characters: number } } {
  const { maxChars } = limits;
  const truncationIndicator = "...[TRUNCATED]...";

  // Split output into lines for truncation statistics
  const lines = output.split("\n");
  const totalLines = lines.length;
  const totalChars = output.length;

  // Check if truncation is necessary
  if (totalChars <= maxChars) {
    return output;
  }

  // Calculate available space for start and end parts
  const availableChars = maxChars - truncationIndicator.length;
  const partLength = Math.floor(availableChars / 2);

  // Extract the first and last parts of the output
  const startPart = output.slice(0, partLength);
  const endPart = output.slice(-partLength);

  // Calculate the number of truncated lines and characters
  const truncatedCharacters = totalChars - (startPart.length + endPart.length + truncationIndicator.length);
  const truncatedLines = totalLines - (startPart.split("\n").length + endPart.split("\n").length - 1); // Adjust for potential overlap in line counting

  // Construct the truncated output
  const truncatedOutput = startPart + truncationIndicator + endPart;

  return {
    output: truncatedOutput,
    truncatedDetails: {
      lines: truncatedLines,
      characters: truncatedCharacters,
    },
  };
}
