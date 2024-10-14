import chalk from "chalk";
import { config } from "dotenv";
import { APIError } from "openai";
import { runAgent } from "./ai/agent";
import { parseArguments } from "./cli/interface";
import { MAX_INPUT_LENGTH } from "./constants";
import { deleteAPIKey } from "./utils/apiKeyManager";
import { getOrPromptForAPIKey } from "./utils/getOrPromptForAPIKey";

config();

async function main() {
  const { input, resetKey, showHelp } = parseArguments(Bun.argv);

  if (showHelp) {
    printHelp();
    return;
  }

  if (resetKey) {
    await deleteAPIKey();
    console.log(chalk.green("API key has been deleted. You will be prompted for a new key on the next run."));
    return;
  }
  const apiKey = await getOrPromptForAPIKey();

  console.log(chalk.cyan("API key:", apiKey.substring(0, 5) + "..." + apiKey.substring(apiKey.length - 5)));

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
        chalk.green("\n\nFinal response:\n------------------\n\n", agentResponse, "\n\n------------------\n"),
      );
    } catch (error) {
      if (error instanceof APIError) {
        if (error.status === 401) {
          console.error(chalk.red("Invalid OpenAI API key. Deleting stored key. " + error.message));
          await deleteAPIKey();
          process.exit(1);
        }
      }
      console.error(chalk.red("Error running agent:"), error);
    }
  } else {
    console.log(chalk.yellow("No input received. Please provide input for the agent."));
  }
}

function printHelp() {
  console.log(chalk.cyan("AI Console Agent Usage:"));
  console.log('  ai-console-agent [options] "<your command or question>"');
  console.log("\nOptions:");
  console.log("  --help, -h     Show this help message");
  console.log("  --reset-key    Delete the stored API key and prompt for a new one");
  console.log("\nExamples:");
  console.log('  ai-console-agent "Show me the disk usage of the current directory"');
  console.log("  ai-console-agent --reset-key");
}

main().catch(console.error);
