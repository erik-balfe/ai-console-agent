import { v4 as uuidv4 } from "uuid";
import { Database, insertToolUse } from "../utils/database";
import { logger } from "../utils/logger";

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
        logger.info(`Starting tool: ${toolName} [${toolCallId}] with arguments: ${JSON.stringify(params)}`);
        result = await toolFunction(params);
        executionTime = Date.now() - startTime;
        logger.debug(`Tool output: ${JSON.stringify(result)}`);
      } catch (error) {
        executionTime = Date.now() - startTime;
        logger.error(`Error executing tool: ${toolName} [${toolCallId}]`, error);
        throw error;
      } finally {
        await insertToolUse(
          db,
          conversationId,
          toolCallId,
          toolName,
          JSON.stringify(params),
          JSON.stringify(result || "undefined"),
          executionTime,
          Date.now(),
        );
      }

      return result;
    };
  };
}
