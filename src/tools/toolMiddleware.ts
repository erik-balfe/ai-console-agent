import { v4 as uuidv4 } from "uuid";
import { Database, insertToolUse } from "../utils/database";
import { debug, error, warn } from "../utils/logger/Logger";

export function createToolMiddleware(db: Database, conversationId: number) {
  return function wrapTool<T extends Record<string, any>>(
    toolName: string,
    toolFunction: (params: T) => Promise<string>,
  ): (params: T) => Promise<string> {
    return async (params: T): Promise<string> => {
      const toolCallId = uuidv4();
      const startTime = Date.now();
      let result: string | undefined;
      let executionTime = 0;

      try {
        warn(`Starting tool: "${toolName}", ID: "${toolCallId}" with arguments: "${JSON.stringify(params)}"`);
        result = await toolFunction(params);
        executionTime = Date.now() - startTime;
        debug(`Tool output: ${JSON.stringify(result)}`);
      } catch (err) {
        executionTime = Date.now() - startTime;
        error(`Error executing tool: ${toolName} [${toolCallId}]`, err);
        throw err;
      } finally {
        await insertToolUse({
          db,
          conversationId,
          toolCallId,
          toolName,
          inputParams: JSON.stringify(params),
          output: JSON.stringify(result) || "undefined",
          duration: executionTime,
          timestamp: Date.now(),
        });
      }

      return result;
    };
  };
}
