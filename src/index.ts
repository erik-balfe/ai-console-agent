import chalk from "chalk";
import { config } from "dotenv";
import { APIError } from "openai";
import { runAgent } from "./ai/agent";
import { parseArguments, printHelp } from "./cli/interface";
import { MAX_INPUT_LENGTH } from "./constants";
import { deleteAPIKey } from "./utils/apiKeyManager";
import { loadConfig, saveConfig } from "./utils/config";
import { getOrPromptForAPIKey } from "./utils/getOrPromptForAPIKey";
import { logger, LogLevel } from "./utils/logger";

import { initializeDatabase, printDatabaseContents } from "./utils/database";

config();

async function main() {
  const db = await initializeDatabase();
  logger.info("Database initialized successfully");
  printDatabaseContents(db);
  const startTime = Date.now();

  try {
    const { input, resetKey, showHelp, setLogLevel, getLogLevel } = parseArguments(Bun.argv);

    const { appConfig, userPrefs } = loadConfig();

    if (showHelp) {
      printHelp();
      return;
    }

    if (setLogLevel !== undefined) {
      if (saveConfig({ logLevel: LogLevel[setLogLevel] }, {})) {
        console.log(chalk.green(`Log level has been set to ${setLogLevel}`));
      } else {
        console.log(chalk.red("Failed to set log level. Please try again."));
      }
      return;
    }

    if (getLogLevel) {
      console.log(chalk.blue(`Current log level: ${LogLevel[appConfig.logLevel]}`));
      return;
    }

    logger.setLevel(appConfig.logLevel);

    if (resetKey) {
      deleteAPIKey();
      console.log(
        chalk.green("API key has been deleted. You will be prompted for a new key on the next run."),
      );
      return;
    }

    if (!input) {
      console.log(chalk.yellow("No input received. Use --help to see usage instructions."));
      return;
    }

    const apiKey = await getOrPromptForAPIKey();

    logger.debug(
      chalk.cyan("API key:", apiKey.substring(0, 5) + "..." + apiKey.substring(apiKey.length - 5)),
    );

    if (input.length > MAX_INPUT_LENGTH) {
      console.error(
        chalk.red(`Input is too long. Please limit your input to ${MAX_INPUT_LENGTH} characters.`),
      );
      return;
    }

    try {
      const agentResponse = await runAgent(input, db);
      if (agentResponse === "Task aborted by user.") {
        console.log(chalk.yellow(agentResponse));
        return;
      }
    } catch (error) {
      if (error instanceof APIError) {
        if (error.status === 401) {
          console.error(chalk.red("Invalid OpenAI API key." + error.message));
          deleteAPIKey();
          await getOrPromptForAPIKey();
        }
      }
      console.error(chalk.red("Error running agent:"), error);
    }
  } catch (error) {
    console.error(chalk.red("Error:"), error.message);
    printHelp();
  } finally {
    if (db) {
      db.close();
    }
  }
}

main().catch(console.error);
