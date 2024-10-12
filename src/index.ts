import chalk from "chalk";
import { config } from "dotenv";
import { runAgent } from "./ai/agent";
import { parseArguments } from "./cli/interface";
import { MAX_INPUT_LENGTH, OPENAI_API_KEY } from "./constants";

config();

async function main() {
  const { input } = parseArguments(Bun.argv);

  checkAPIKey();

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

function checkAPIKey() {
  if (!OPENAI_API_KEY) {
    console.error(
      chalk.red("Error: OPENAI_API_KEY is not set. Please set it in your environment variables."),
    );
    console.log(chalk.yellow("You can set it by running:"));
    // refer to readme and provide more easy way to set the key
    console.log(chalk.cyan("export OPENAI_API_KEY=your_api_key_here"));
    process.exit(1);
  }
}
