import chalk from "chalk";
import { config } from "dotenv";
import { APIError } from "openai";
import { runAgent } from "./ai/agent";
import { parseArguments } from "./cli/interface";
import { MAX_INPUT_LENGTH } from "./constants";
import { deleteAPIKey } from "./utils/apiKeyManager";
import { loadConfig, saveConfig } from "./utils/config";
import { getOrPromptForAPIKey } from "./utils/getOrPromptForAPIKey";
import { logger, LogLevel } from "./utils/logger";

config();

async function main() {
  const { input, resetKey, showHelp, setLogLevel, getLogLevel } = parseArguments(Bun.argv);

  const storedConfig = loadConfig();

  if (setLogLevel !== undefined) {
    saveConfig({ logLevel: setLogLevel });
    console.log(chalk.green(`Log level has been set to ${LogLevel[setLogLevel]}`));
    return;
  }

  if (getLogLevel) {
    console.log(chalk.blue(`Current log level: ${LogLevel[storedConfig.logLevel]}`));
    return;
  }

  logger.setLevel(storedConfig.logLevel);

  if (showHelp) {
    printHelp();
    return;
  }

  if (resetKey) {
    await deleteAPIKey();
    console.log(chalk.green("API key has been deleted. You will be prompted for a new key on the next run."));
    return;
  }

  if (!input) {
    console.log(chalk.yellow("No input received. Use --help to see usage instructions."));
    return;
  }
  const apiKey = await getOrPromptForAPIKey();

  logger.debug(chalk.cyan("API key:", apiKey.substring(0, 5) + "..." + apiKey.substring(apiKey.length - 5)));

  if (input.length > MAX_INPUT_LENGTH) {
    console.error(chalk.red(`Input is too long. Please limit your input to ${MAX_INPUT_LENGTH} characters.`));
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
        console.error(chalk.red("Invalid OpenAI API key." + error.message));
        await deleteAPIKey();
        await getOrPromptForAPIKey();
      }
    }
    console.error(chalk.red("Error running agent:"), error);
  }
}

function printHelp() {
  console.log(chalk.cyan("AI Console Agent Usage:"));
  console.log('  ai-console-agent [options] "<your command or question>"');
  console.log("\nOptions:");
  console.log("  --help, -h                  Show this help message");
  console.log("  --reset-key                 Delete the stored API key and prompt for a new one");
  console.log("  --log-level=<level>         Set the log level (DEBUG, INFO, WARN, ERROR)");
  console.log("  --get-log-level             Display the current log level");
  console.log("\nExamples:");
  console.log('  ai-console-agent "Show me the disk usage of the current directory"');
  console.log("  ai-console-agent --reset-key");
  console.log("  ai-console-agent --log-level=DEBUG");
  console.log("  ai-console-agent --get-log-level");
}

main().catch(console.error);
