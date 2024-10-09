import chalk from "chalk";
import { FunctionTool } from "llamaindex";
import readline from "readline";

export const userInteractionTool = new FunctionTool(
  async (params: { question: string; options: string[]; binary: boolean }) => {
    const { question, options = [], binary = false } = params;

    let choices = options;
    if (binary) {
      choices = ["Yes", "No"];
    }
    choices.push("Abort the current task");

    const selectedIndex = await displayOptions(question, choices);

    if (selectedIndex === choices.length - 1) {
      console.log(chalk.red("Task aborted by user."));
      process.exit(0); // This will stop the program immediately
    }

    return choices[selectedIndex];
  },
  {
    name: "userInteraction",
    description: "Interact with the user to get input, confirmation, or clarification on ambiguous points",
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
        binary: {
          type: "boolean",
          description: "If true, presents a Yes/No question",
        },
      },
      required: ["question"],
    },
  },
);

function displayOptions(question: string, options: string[]): Promise<number> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    let selectedIndex = 0;
    let lineCount = 0;
    let isFirstRender = true;

    function clearPreviousOutput() {
      if (lineCount > 0) {
        readline.moveCursor(process.stdout, 0, -lineCount);
        readline.clearScreenDown(process.stdout);
      }
    }

    function renderOptions() {
      if (!isFirstRender) {
        clearPreviousOutput();
      }
      console.log(chalk.yellow(question));
      options.forEach((option, index) => {
        if (index === selectedIndex) {
          console.log(chalk.bold.green(`> ${option}`));
        } else {
          console.log(chalk.gray(`  ${option}`));
        }
      });
      lineCount = options.length + 1; // +1 for the question
      isFirstRender = false;
    }

    renderOptions();

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    process.stdin.on("keypress", (str, key) => {
      if (key.name === "up" && selectedIndex > 0) {
        selectedIndex--;
      } else if (key.name === "down" && selectedIndex < options.length - 1) {
        selectedIndex++;
      } else if (key.name === "return") {
        rl.close();
        resolve(selectedIndex);
      }
      renderOptions();
    });
  });
}
