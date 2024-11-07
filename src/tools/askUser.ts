import { FunctionTool } from "llamaindex";
import { displayOptionsAndGetInput } from "../cli/interface";
import { Database } from "../utils/database";
import { logger } from "../utils/logger";
import { createToolMiddleware } from "./toolMiddleware";

interface AskUserParams {
  question: string;
  options: string[];
}

const askUserCallback = async (params: AskUserParams): Promise<string> => {
  logger.debug("Starting userInteractionTool");

  const { question, options = [] } = params;

  logger.userInteraction(`Question: ${question}`);
  logger.debug(`Options: ${options.join(", ")}`);

  try {
    const result = await displayOptionsAndGetInput(question, options);
    logger.userInteraction(`User response: ${result}`);

    if (result === "<input_aborted_by_user />") {
      throw new Error(result);
    }
    return result;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "<input_aborted_by_user />") {
        logger.info(`AskUser choice aborted by user`);
        return "User chose to abort the task. It is a sign to end the conversation. No further actions are needed.";
      }
    } else {
      logger.error("Unknown error during user interaction");
    }
    throw error;
  }
};

export function createAskUserTool(db: Database, conversationId: number) {
  const wrappedCallback = createToolMiddleware(db, conversationId)("askUser", askUserCallback);

  return new FunctionTool<AskUserParams, Promise<string>>(wrappedCallback, {
    name: "askUser",
    description:
      "Facilitate user interaction to gather input, confirm choices, or clarify any ambiguous points. Offer predefined options to enhance user experience and enable more meaningful engagement. Additionally, it is always allowed for the user to provide free-form responses instead of listed options.",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "The question to ask the user",
        },
        options: {
          type: "array",
          items: { type: "string" },
          description: "List of options for the user to choose from (max 30 words each).",
        },
      },
      required: ["question"],
    },
  });
}
