import chalk from "chalk";
import { FunctionTool } from "llamaindex";
import { getUserConfirmation } from "../cli/interface";
import { getCurrentRunId } from "../utils/runManager";
import { runShellCommand } from "../utils/runShellCommand";
import { TmuxWrapper } from "./TmuxWrapper";

export const executeCommandTool = new FunctionTool(
  async (params: {
    command: string;
    requireConfirmation: boolean;
    explanation: string;
    interactions: string[];
    useTmux: boolean;
  }) => {
    const {
      command,
      requireConfirmation = false,
      explanation = "No explanation provided",
      interactions = [],
      useTmux = false,
    } = params;

    const runId = getCurrentRunId();
    if (!runId) {
      throw new Error("No active run ID found");
    }

    if (requireConfirmation) {
      const accessGranted = await getUserConfirmation(
        `Do you want to execute this command:\n\n${chalk.blue(command)}\n\n${explanation}`,
      );
      if (!accessGranted) {
        return "Command execution cancelled by user.";
      }
    }

    try {
      console.log(chalk.blue(`Executing command: ${command}`));
      let result: string;

      if (useTmux) {
        result = await TmuxWrapper.run(command, interactions);
      } else {
        const { stdout, stderr } = await runShellCommand(command);
        result = stdout + (stderr ? `\nError: ${stderr}` : "");
      }

      console.log(
        chalk.green(`Successfully completed command "${command}"`) + chalk.gray(`\nResult: "${result}"`),
      );
      return result;
    } catch (error: unknown) {
      console.error(chalk.red("Error in tool executing command:"), error);
      return `Failed to execute command: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: "executeCommand",
    description:
      "Execute a command on the user's system and return the output. Can handle commands requiring simple interactions.",
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
        interactions: {
          type: "array",
          items: { type: "string" },
          description: "List of expected prompts and responses for interactive commands",
          default: [],
        },
        useTmux: {
          type: "boolean",
          description: "If true, uses tmux for command execution, allowing for simple interactions",
          default: false,
        },
      },
      required: ["command"],
    },
  },
);
