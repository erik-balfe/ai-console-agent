import chalk from "chalk";
import { FunctionTool } from "llamaindex";
import { displayOptionsAndGetInput } from "../cli/interface";
import { Database } from "../utils/database";
import { logger } from "../utils/logger";
import { runShellCommand } from "../utils/runShellCommand";
import { createToolMiddleware } from "./toolMiddleware";

interface ExecuteCommandParams {
  command: string;
  requireConfirmation: boolean;
  explanation: string;
}

const executeCommandCallback = async (params: ExecuteCommandParams): Promise<string> => {
  const { command, requireConfirmation = false, explanation = "No explanation provided" } = params;

  if (requireConfirmation) {
    const confirmationQuestion = chalk.blue(
      `\n\nDo you want to execute this command:\n\n>${command}\n\n${explanation}\n\n`,
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
    logger.debug("output:", output);
    const shortOutput = formatShortOutput(output);
    logger.debug("shortOutput:", shortOutput);
    logger.info(`Agent got command output:\n${shortOutput}\n`);
    return JSON.stringify({ stdout, stderr });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Failed to execute command: ${errorMessage}`;
  }
};

export function createExecuteCommandTool(db: Database, conversationId: number) {
  const wrappedCallback = createToolMiddleware(db, conversationId)("executeCommand", executeCommandCallback);

  return new FunctionTool<ExecuteCommandParams, Promise<string>>(wrappedCallback, {
    name: "executeCommand",
    description:
      "Execute a shell command on the user's host system. Commands that suppose to be interactive (like usual 'git commit') are not supported and must be strongly avoided.",
    parameters: {
      type: "object",
      properties: {
        explanation: {
          type: "string",
          description:
            "Command name and args in free form with explanation of what the command does, shown to the user before confirmation, intention of the commoand and expected output (at least type or shape of output expected)",
          default: "No explanation provided",
        },
        command: {
          type: "string",
          description: "The command to execute",
        },
        requireConfirmation: {
          type: "boolean",
          description: "If true, requires explicit user confirmation before executing the command.",
          default: false,
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
