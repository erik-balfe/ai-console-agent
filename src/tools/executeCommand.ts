import chalk from "chalk";
import { FunctionTool } from "llamaindex";
import { displayOptionsAndGetInput } from "../cli/interface";
import { Database } from "../utils/database";
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
      "Execute a command on the user's system. The command is run in a separate process, and the output is captured and returned. Commands that suppose to be interactive (like usual 'git commit') are not supported and must be strongly avoided.",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The command to execute",
        },
        requireConfirmation: {
          type: "boolean",
          description: "If true, requires explicit user confirmation before executing the command.",
          default: false,
        },
        explanation: {
          type: "string",
          description: "Explanation of what the command does, shown to the user before confirmation",
          default: "No explanation provided",
        },
      },
      required: ["command"],
    },
  });
}
