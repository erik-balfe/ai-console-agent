import chalk from "chalk";
import { FunctionTool } from "llamaindex";
import { displayOptionsAndGetInput } from "../cli/interface";

export const userInteractionTool = new FunctionTool(
  async (params: { question: string; options: string[]; allowFreeform: boolean }) => {
    console.log("Starting userInteractionTool");
    const { question, options = [], allowFreeform = true } = params;

    console.log("Question:", question);
    console.log("Options:", options);
    console.log("Allow freeform:", allowFreeform);

    try {
      const result = await displayOptionsAndGetInput(question, options);
      console.log("Result from displayOptionsAndGetInput:", result);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Task aborted by user") {
          console.log(chalk.red("Task aborted by user."));
          return "ABORTED";
        }
        console.error(chalk.red("Error during user interaction:"), error.message);
      } else {
        console.error(chalk.red("Unknown error during user interaction"));
      }
      throw error;
    }
  },
  {
    name: "userInteraction",
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
