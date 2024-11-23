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
      `\n\n${explanation}.\nDo you want to execute this command:\n\n>${command}\n`,
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

    // Use the updated truncateCommandOutput
    const truncatedResult = truncateCommandOutput(output, CONTEXT_ALLOCATION.toolOutput);

    let resultToReturn: any;

    if (typeof truncatedResult === "string") {
      // No truncation case
      resultToReturn = {
        stdout: truncatedResult,
        stderr,
      };
    } else {
      // Truncation happened
      const { output: truncatedOutput, truncatedDetails } = truncatedResult;
      resultToReturn = {
        stdout: truncatedOutput,
        stderr,
        truncated: true,
        truncatedDetails,
      };
    }

    logger.debug("truncated output:", resultToReturn.stdout);
    logger.info(`Agent got command output:\n${resultToReturn.stdout}\n`);
    return JSON.stringify(resultToReturn);
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
- Interactive commands (e.g. 'git commit' requiring editor) are not supported and must be avoided.
- Output limited to ${CONTEXT_ALLOCATION.toolOutput.maxChars} characters.
- Avoid commands producing large output.
- For large outputs, use filters (grep, head, tail, awk, sed) and use piping to files to reduce size of tool output and use more grained output examining via such intermediate files
- Use Scratch Space to store intermediate results when processing large data. Break complex pipelines into steps and save interim results for better manageability and debugging.
- Command parameter does NOT need XML-escaping.
Returns json object with stdout and stderr strings.
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
