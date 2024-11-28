import { FunctionTool } from "llamaindex";
import { AsyncCommand, AsyncCommandTracker } from "../ai/asyncCommandTracker";
import { Database } from "../utils/database";
import { debug, info } from "../utils/logger/Logger";
import { createToolMiddleware } from "./toolMiddleware";

interface WaitParams {
  seconds: number;
  reason?: string;
  interruptOn?: string[]; // command IDs to watch
}

const waitCallback = async (params: WaitParams): Promise<string> => {
  const { seconds, reason, interruptOn = [] } = params;
  const tracker = AsyncCommandTracker.getInstance();

  debug(`Starting wait for ${seconds} seconds with reason: ${reason || "No reason provided"}`);

  return new Promise((resolve) => {
    let interrupted = false;

    // Setup command status change listener
    const statusListener = (command: AsyncCommand) => {
      debug(`Command ${command.id} status changed to ${command.status}`);
      if (interruptOn.includes(command.id) && command.status !== "running") {
        interrupted = true;
        cleanup();
        info(`Interrupted waiting: Command ${command.id} has a status of ${command.status}`);
        resolve(
          JSON.stringify({
            interrupted: true,
            waitedSeconds: Math.round((Date.now() - startTime) / 1000),
            reason: `Command ${command.id} status changed to ${command.status}`,
            commandStatus: command,
          }),
        );
      }
    };

    const startTime = Date.now();
    tracker.on("commandStatusChanged", statusListener);

    // Setup timeout
    const timeout = setTimeout(() => {
      if (!interrupted) {
        cleanup();
        info(`Wait completed for ${seconds} seconds with reason: ${reason || "No reason provided"}`);
        resolve(
          JSON.stringify({
            interrupted: false,
            waitedSeconds: seconds,
            reason,
          }),
        );
      }
    }, seconds * 1000);

    // Cleanup function
    const cleanup = () => {
      clearTimeout(timeout);
      tracker.off("commandStatusChanged", statusListener);
    };
  });
};

export function createWaitTool(db: Database, conversationId: number) {
  const wrappedCallback = createToolMiddleware(db, conversationId)("wait", waitCallback);

  return new FunctionTool<WaitParams, Promise<string>>(wrappedCallback, {
    name: "wait",
    description: `Pause execution for a specified number of seconds. Can be interrupted by changes in the status of monitored async commands. Use this tool to manage long-running tasks effectively by waiting for a specific duration or until a condition is met.`,
    parameters: {
      type: "object",
      properties: {
        seconds: {
          type: "number",
          description: "Number of seconds to wait",
        },
        reason: {
          type: "string",
          description: "Optional reason for waiting",
        },
        interruptOn: {
          type: "array",
          items: { type: "string" },
          description: "Optional list of command IDs to watch for status changes",
        },
      },
      required: ["seconds"],
    },
  });
}
