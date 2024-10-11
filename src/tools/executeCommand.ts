import chalk from "chalk";
import { FunctionTool } from "llamaindex";
import { displayOptionsAndGetInput } from "../cli/interface";
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
      const confirmationQuestion = `\n\nDo you want to execute this command:\n\n${chalk.blue(command)}\n\n${explanation}`;
      const userChoice = await displayOptionsAndGetInput(confirmationQuestion, ["Yes", "No"]);
      if (userChoice === "No") {
        return "Command execution cancelled by user.";
      }
    }

    try {
      console.log(chalk.blue(`Executing command: ${command}`));
      let result: string;

      if (useTmux) {
        result = await TmuxWrapper.run(command, interactions);
      } else {
        try {
          const { stdout, stderr } = await runShellCommand(command, { shell: "bash" });
          result = JSON.stringify({ stdout, stderr });
        } catch (error) {
          console.error(chalk.red("Error in tool executing command:"), error);
          return { stderr: error instanceof Error ? error.message : String(error) };
        }
      }

      console.log(
        chalk.green(`Successfully completed command "${command}"`) + chalk.gray(`\nResult:\n"${result}"`),
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
