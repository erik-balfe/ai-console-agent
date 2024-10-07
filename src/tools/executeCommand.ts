import { FunctionTool } from "llamaindex";
import { getUserConfirmation } from "../cli/interface";
import { safeExecute } from "../utils/safeExecution";

export const executeCommandTool = new FunctionTool(
  async (params: { command: string }) => {
    const { command } = params;
    console.log(`Proposed command: ${command}`);
    const confirmed = await getUserConfirmation("Do you want to execute this command?");
    if (!confirmed) {
      return "Command execution cancelled by user.";
    }
    try {
      const result = await safeExecute(command);
      return `Command executed successfully. Output:\n${result}`;
    } catch (error: unknown) {
      console.error("Error executing command:", error);
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
      },
      required: ["command"],
    },
  },
);
