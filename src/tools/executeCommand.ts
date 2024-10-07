import { FunctionTool } from "llamaindex";
import { getUserConfirmation } from "../cli/interface";
import { runShellCommand } from "../utils/runShellCommand";

export const executeCommandTool = new FunctionTool(
  async (params: { command: string; requireConfirmation: boolean; explanation: string }) => {
    const { command, requireConfirmation = false, explanation = "No explanation provided" } = params;
    console.log(`Proposed command: ${command}`);
    console.log(`Require confirmation: ${requireConfirmation}`);
    console.log(`Explanation: ${explanation}`);

    if (requireConfirmation) {
      console.log(`Requesting user confirmation for command: ${command}`);
      const accessGranted = await getUserConfirmation("Do you want to execute this command:\n\n" + command + '\n\n' + explanation);
      console.log(`User confirmation result: ${accessGranted}`);
      if (!accessGranted) {
        console.log("Command execution cancelled by user.");
        return "Command execution cancelled by user.";
      }
    }

    try {
      console.log(`Executing command: ${command}`);
      const result = await runShellCommand(command);
      console.log(`Successfully completed command "${command}". Result: ${JSON.stringify(result)}`);
      return JSON.stringify(result);
    } catch (error: unknown) {
      console.error("Error in tool executing command:", error);
      console.log(`Command execution failed: ${command}`);
      return `Failed to execute command: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: "executeCommand",
    description: "Execute a command on the user's system and return the output",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The command to execute",
        },
        requireConfirmation: {
          type: "boolean",
          description:
            "If true, requires explicit user confirmation (y/n) before executing the command. Used for potentially dangerous commands, that change state",
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
