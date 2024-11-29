import chalk from "chalk";
import { config } from "dotenv";
import { APIError } from "openai";
import { agentLoop } from "./ai/agent";
import { formatApiKey, getAllStoredKeys } from "./cli/getAllKeys";
import { parseArguments, printHelp } from "./cli/interface";
import { EMBEDDINGS_MODEL_ID, MAX_INPUT_LENGTH } from "./constants";
import { deleteAPIKey } from "./utils/apiKeyManager";
import { loadConfig } from "./utils/config";
import { initializeDatabase } from "./utils/database";
import { getContextAllocation } from "./utils/getContextAllocation";
import { getOrPromptForAPIKey, getProviderFromModel } from "./utils/getOrPromptForAPIKey";
import { debug, info, Logger } from "./utils/logger/Logger";

config();

async function main() {
  let db;

  try {
    const parsedArgs = parseArguments(Bun.argv);
    let { appConfig: configFromFile } = loadConfig();
    const { input, resetKey, showHelp, showAPIKeys, newConversation } = parsedArgs;

    const appConfig = { ...configFromFile, ...parsedArgs };
    // Override config with command line arguments
    if (parsedArgs.logLevel) {
      appConfig.logging.level = parsedArgs.logLevel;
    }
    if (parsedArgs.logToFile !== undefined) {
      appConfig.logging.enabled = parsedArgs.logToFile;
    }
    if (parsedArgs.logPath) {
      appConfig.logging.path = parsedArgs.logPath;
    }

    await Logger.initialize({
      level: appConfig.logging.level,
      fileOutput: {
        enabled: appConfig.logging.enabled,
        path: appConfig.logging.path,
      },
      consoleOutputEnabled: appConfig.logging.consoleOutputEnabled,
    });

    if (showHelp) {
      printHelp();
      return;
    }

    await getOrPromptForAPIKey(EMBEDDINGS_MODEL_ID, {
      prePromptText:
        "Please enter your OpenAI API key. It is used for embeddings and will consume small amount of tokens",
    });

    info(`running using model "${appConfig.model}"`);

    if (showAPIKeys) {
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

    debug(chalk.cyan("API key:", apiKey.substring(0, 5) + "..." + apiKey.substring(apiKey.length - 5)));

    if (input.length > MAX_INPUT_LENGTH) {
      console.error(
        chalk.red(`Input is too long. Please limit your input to ${MAX_INPUT_LENGTH} characters.`),
      );
      return;
    }
    const contextAllocation = getContextAllocation(appConfig);

    try {
      debug("Starting user interaction loop");
      let userQuery = input;
      debug(`Initial user query: ${userQuery}`);
      await agentLoop(userQuery, db, appConfig, contextAllocation, newConversation);
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
