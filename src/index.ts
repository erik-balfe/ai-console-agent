import chalk from "chalk";
import { config } from "dotenv";
import { runAgent } from "./ai/agent";
import { parseArguments } from "./cli/interface";
import { MAX_INPUT_LENGTH } from "./constants";

config();

async function main() {
  const { input } = parseArguments(process.argv);

  if (input) {
    console.log(chalk.cyan(`Input: ${input}`));

    if (input.length > MAX_INPUT_LENGTH) {
      console.error(
        chalk.red(`Input is too long. Please limit your input to ${MAX_INPUT_LENGTH} characters.`),
      );
      return;
    }

    try {
      const agentResponse = await runAgent(input);
      console.log(
        chalk.green("\n\nFinal response:\n------------------\n\n"),
        agentResponse,
        "\n\n------------------\n",
      );
    } catch (error) {
      console.error(chalk.red("Error running agent:"), error);
    }
  } else {
    console.log(chalk.yellow("No input received. Please provide input for the agent."));
  }
}

main().catch(console.error);
