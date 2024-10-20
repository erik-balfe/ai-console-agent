import chalk from "chalk";
import { FunctionTool } from "llamaindex";
import { displayOptionsAndGetInput } from "../cli/interface";
import { logger } from "../utils/logger";
import { getCurrentRunId } from "../utils/runManager";
import { runShellCommand } from "../utils/runShellCommand";

export const executeCommandTool = new FunctionTool(
  async (params: { command: string; requireConfirmation: boolean; explanation: string }) => {
    const { command, requireConfirmation = false, explanation = "No explanation provided" } = params;

    const runId = getCurrentRunId();
    if (!runId) {
      throw new Error("No active run ID found");
    }

    if (requireConfirmation) {
      const confirmationQuestion = `\n\nDo you want to execute this command:\n\n${chalk.blue(command)}\n\n${explanation}`;
      const userChoice = await displayOptionsAndGetInput(confirmationQuestion, ["Yes", "No"]);
      if (userChoice === "No") {
        return "Command execution cancelled by user.";
      }
    }

    try {
      logger.info(`Executing command: ${command}`);
      const { stdout, stderr } = await runShellCommand(command, { shell: "bash" });
      const result = JSON.stringify({ stdout, stderr });
      logger.debug(`Command result: ${result}`);
      return result;
    } catch (error: unknown) {
      logger.error(`Failed to execute command: ${error instanceof Error ? error.message : String(error)}`);
      return `Failed to execute command: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: "executeCommand",
    description:
      "Execute a command on the user's system. The command is run in a separate process, and the output is captured and returned. Commands that suppose to be interactive are not supported and must be strongly avoided.",
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
  },
);
