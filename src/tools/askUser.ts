import { FunctionTool } from "llamaindex";
import { displayOptionsAndGetInput } from "../cli/interface";
import { Database } from "../utils/database";
import { logger } from "../utils/logger";
import { createToolMiddleware } from "./toolMiddleware";

interface AskUserParams {
  question: string;
  options?: string[];
  withoutFreeAnswer?: boolean;
}

export async function askUserCallback(
  params: AskUserParams,
): Promise<{ answer: string; duration: number; cancelled?: boolean }> {
  logger.debug("Starting userInteractionTool");
  const startTime = Date.now();
  let duration = 0;
  const { question, options = [] } = params;

  // logger.userInteraction(`Question: ${question}`);
  // logger.debug(`Options: ${options.join(", ")}`);

  try {
    const result = await displayOptionsAndGetInput(question, options);
    duration = Date.now() - startTime;
    logger.userInteraction(`User response: ${result}, duration: ${duration}ms`);
    if (result === "<input_aborted_by_user />") {
      return { cancelled: true, duration, answer: result };
    }
    return { answer: result, duration };
  } catch (error) {
    logger.error("Unknown error during user interaction");
    throw error;
  }
}

// export function createAskUserTool(db: Database, conversationId: number) {
//   const wrappedCallback = createToolMiddleware(db, conversationId)("askUser", askUserCallback);

//   return new FunctionTool<AskUserParams, Promise<string>>(wrappedCallback, {
//     name: "askUser",
//     description:
//       "This provides user a prompt in console interface with a 'question' passed as argument and optionally provides predefined options that are displayed in user's console interface to choose from by just selecting one of them by keyboard. Additionally to provided options, user of The App is always allowed to type responses instead of selecting from provided options.",
//     parameters: {
//       type: "object",
//       properties: {
//         question: {
//           type: "string",
//           description: "The question to ask the user",
//         },
//         options: {
//           type: "array",
//           items: { type: "string" },
//           description: "List of options for the user to choose from (max 30 words each).",
//         },
//       },
//       required: ["question"],
//     },
//   });
// }
