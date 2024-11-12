import path from "path";
import { logger } from "./logger";

export function getUserHomeDir(): string {
  logger.debug("Environment variables:");
  logger.debug(`HOME: ${process.env.HOME}`);
  logger.debug(`USER: ${process.env.USER}`);
  logger.debug(`USERNAME: ${process.env.USERNAME}`);
  logger.debug(`PWD: ${process.env.PWD}`);
  logger.debug(`LOGNAME: ${process.env.LOGNAME}`);
  logger.debug(`Current UID: ${process.getuid?.()}`);

  // Print all environment variables for debugging
  logger.debug("All environment variables:");
  Object.entries(process.env).forEach(([key, value]) => {
    logger.debug(`${key}: ${value}`);
  });

  // First try standard environment variables
  if (process.env.HOME) {
    logger.debug(`Using HOME env var: ${process.env.HOME}`);
    return process.env.HOME;
  }

  // Fallback to constructing path from username
  const username = process.env.USER || process.env.USERNAME || process.env.LOGNAME;
  if (username) {
    const homePath = path.join("/home", username);
    logger.debug(`Constructed home path from username: ${homePath}`);
    return homePath;
  }

  logger.error("Could not determine user home directory");
  logger.error("No HOME env var and no username found");
  throw new Error("Could not determine user home directory");
}
