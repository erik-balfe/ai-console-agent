import { FunctionTool } from "llamaindex";
import { displayOptionsAndGetInput } from "../cli/interface";
import { logger } from "../utils/logger";

export const askUserTool = new FunctionTool(
  async (params: { question: string; options: string[]; allowFreeform: boolean }) => {
    logger.debug("Starting userInteractionTool");
    const { question, options = [], allowFreeform = true } = params;

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
          throw error;
        }
      } else {
        logger.error("Unknown error during user interaction");
      }
      throw error;
    }
  },
  {
    name: "askUser",
    description:
      "Interact with the user to get input, confirmation, or clarification on ambiguous points. Provide answer options for better UX and more quality interaction with user. Also supports free-form input by user if not disabled",
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
        allowFreeform: {
          type: "boolean",
          description: "If true, allows the user to provide a custom answer",
          default: true,
        },
      },
      required: ["question"],
    },
  },
);
