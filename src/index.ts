import chalk from "chalk";
import { config } from "dotenv";
import { APIError } from "openai";
import { agentLoop } from "./ai/agent";
import { formatApiKey, getAllStoredKeys } from "./cli/getAllKeys";
import { parseArguments, printHelp } from "./cli/interface";
import { EMBEDDINGS_MODEL_ID, MAX_INPUT_LENGTH } from "./constants";
import { deleteAPIKey } from "./utils/apiKeyManager";
import { loadConfig, saveConfig } from "./utils/config";
import { initializeDatabase } from "./utils/database";
import { getOrPromptForAPIKey, getProviderFromModel } from "./utils/getOrPromptForAPIKey";
import { logger, LogLevel } from "./utils/logger";

config();

async function main() {
  let db;

  try {
    const { input, resetKey, showHelp, setLogLevel, getLogLevel, model, showKeys } = parseArguments(Bun.argv);

    const { appConfig, userPrefs } = loadConfig();

    if (setLogLevel !== undefined) {
      if (saveConfig({ logLevel: LogLevel[setLogLevel] }, {})) {
        console.log(chalk.green(`Log level has been set to ${setLogLevel}`));
      } else {
        console.log(chalk.red("Failed to set log level. Please try again."));
        process.exit(1);
      }
    }

    if (getLogLevel) {
      console.log(chalk.blue(`Current log level: ${LogLevel[appConfig.logLevel]}`));
      return;
    }

    if (showHelp) {
      printHelp();
      return;
    }

    // maybe needs persisting
    if (model) {
      appConfig.model = model;
    }

    await getOrPromptForAPIKey(EMBEDDINGS_MODEL_ID, {
      prePromptText:
        "Please enter your OpenAI API key. It is used for embeddings and will consume small amount of tokens",
    });

    logger.info(`running using model "${appConfig.model}"`);

    logger.setLevel(appConfig.logLevel);

    if (showKeys) {
      const keys = await getAllStoredKeys();
      console.log(chalk.cyan("\nStored API Keys:"));
      for (const [provider, key] of Object.entries(keys)) {
        console.log(
          chalk.yellow(`${provider}: `) + (key ? chalk.green(formatApiKey(key)) : chalk.red("Not set")),
        );
      }
      return;
    }

    if (resetKey) {
      const provider = getProviderFromModel(appConfig.model);
      await deleteAPIKey(provider);
      console.log(
        chalk.green("API key has been deleted. You will be prompted for a new key on the next run."),
      );
      return;
    }

    db = await initializeDatabase();
    const apiKey = await getOrPromptForAPIKey(appConfig.model);

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
      logger.debug("Starting user interaction loop");
      let userQuery = input;
      logger.debug(`Initial user query: ${userQuery}`);
      await agentLoop(userQuery, db, appConfig);
    } catch (error) {
      if (error instanceof APIError) {
        if (error.status === 401) {
          console.error(chalk.red("Invalid API key." + error.message));
          await deleteAPIKey(appConfig.model);
          await getOrPromptForAPIKey(appConfig.model);
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

await main().catch(console.error);
