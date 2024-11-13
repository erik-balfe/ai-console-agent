import chalk from "chalk";
import { FunctionTool } from "llamaindex";
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
}

const executeCommandCallback = async (params: ExecuteCommandParams): Promise<string> => {
  const {
    command,
    requireConfirmation: { enabled, description: explanation } = { enabled: false, description: "" },
  } = params;

  if (enabled) {
    if (!explanation) {
      throw new Error("requireConfirmation.description is required when requireConfirmation.enabled is true");
    }
    const confirmationQuestion = chalk.blue(
      `\n\n${explanation}.\\nDo you want to execute this command:\n\n>${command}\n`,
    );
    const userChoice = await displayOptionsAndGetInput(confirmationQuestion, ["Yes", "No"]);
    if (userChoice === "No") {
      return "Command execution cancelled by user.";
    }
  }

  try {
    const { stdout, stderr } = await runShellCommand(command, { shell: "bash" });
    logger.info(`Agent run command:\n$${command}\n`);

    const output = stderr || stdout;
    const { truncatedOutput, wasLimit } = truncateCommandOutput(output, CONTEXT_ALLOCATION.toolOutput);

    if (wasLimit) {
      logger.warn(wasLimit);
    }

    logger.debug("truncated output:", truncatedOutput);
    logger.info(`Agent got command output:\n${truncatedOutput}\n`);
    return JSON.stringify({
      stdout: truncatedOutput,
      stderr,
      ...(wasLimit && {
        truncated: true,
        originalLength: output.length,
        truncatedLength: truncatedOutput.length,
      }),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Failed to execute command: ${errorMessage}`;
  }
};

export function createExecuteCommandTool(db: Database, conversationId: number) {
  const wrappedCallback = createToolMiddleware(db, conversationId)("executeCommand", executeCommandCallback);

  return new FunctionTool<ExecuteCommandParams, Promise<string>>(wrappedCallback, {
    name: "bash",
    description: `Execute a shell command on the user's host system.
- Commands that suppose to be interactive (like usual 'git commit' - requires editor to be open and save commit message) are not supported and must be strongly avoided.
- Command output is limited to ${CONTEXT_ALLOCATION.toolOutput.maxChars} characters).
- Please avoid commands that may produce a very large amount of output.
- For commands that might produce large output, consider using more targeted commands with filters like grep, head, tail, awk, or sed to reduce output size. You can also pipe commands together to filter and format the output before it reaches the limit.
- Use Scratch Space to store intermediate results when processing large amounts of data. Instead of constructing complex command pipelines, break down operations into steps and save intermediate results to files in Scratch Space. This makes the process more manageable and allows examining intermediate data if needed.
- When invoking this tool, the contents of the "command" parameter does NOT need to be XML-escaped.
It always returns a json object with stdout and stderr strings.
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
                "Description of the comamand, that will be shown to the user before confirmation. Required if requireConfirmation is true.",
            },
          },
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
    return `${firstNLines}\n...\n${lastNLines}`;
  } else {
    return `${longText.slice(0, assumedLineLength)}...${longText.slice(-assumedLineLength)}`;
  }
}

function truncateCommandOutput(
  output: string,
  limits: ContextAllocationItem,
): {
  truncatedOutput: string;
  wasLimit?: string;
} {
  const { maxChars } = limits;

  if (output.length <= maxChars) {
    return { truncatedOutput: output };
  }

  // If output is too long, truncate it and format it
  const truncated = formatShortOutput(output, 2, maxChars / 4);
  return {
    truncatedOutput: truncated,
    wasLimit: `Output was truncated from ${output.length} to ${truncated.length} characters`,
  };
}
