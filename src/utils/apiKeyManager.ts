import { Entry, keyring } from "@napi-rs/keyring";
import { APIProvider } from "../constants";
import { getProviderFromModel } from "./getOrPromptForAPIKey";
import { logger } from "./logger";

const SERVICE_NAME = "AIConsoleAgent";

export function checkKeyringAvailability(): boolean {
  try {
    logger.debug("Checking keyring service availability...");
    logger.debug(`Keyring platform: ${keyring.platform()}`);
    logger.debug(`Process UID: ${process.getuid?.()}`);
    logger.debug(`Process GID: ${process.getgid?.()}`);

    // Test keyring with a simple operation
    const testEntry = new Entry("ai-console-agent-test", "service-test");
    logger.debug("Created test keyring entry");

    testEntry.setPassword("test-value");
    logger.debug("Successfully set test password");

    const retrievedValue = testEntry.getPassword();
    logger.debug(`Successfully retrieved test password: ${retrievedValue === "test-value"}`);

    testEntry.deletePassword();
    logger.debug("Successfully deleted test password");

    return true;
  } catch (error) {
    logger.error("Keyring service error:", error);
    if (error instanceof Error) {
      logger.error("Error name:", error.name);
      logger.error("Error message:", error.message);
      logger.error("Error stack:", error.stack);
    }
    return false;
  }
}

const getEntryForProvider = (provider: APIProvider): Entry => {
  logger.debug(`Creating keyring entry for provider: ${provider}`);
  return new Entry(SERVICE_NAME, `${provider}APIKey`);
};

export function storeAPIKey(apiKey: string, provider: APIProvider): void {
  try {
    logger.debug(`Attempting to store ${provider} API key`);
    const entry = getEntryForProvider(provider);
    entry.setPassword(apiKey);
    logger.debug(`${provider} API key stored successfully`);
  } catch (error) {
    logger.error(`Failed to store ${provider} API key:`, error);
    if (error instanceof Error) {
      logger.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }
    throw new Error(`Failed to securely store the ${provider} API key`);
  }
}

export function getAPIKey(provider: APIProvider): string | null {
  try {
    logger.debug(`Attempting to retrieve ${provider} API key`);
    const entry = getEntryForProvider(provider);
    const apiKey = entry.getPassword();
    logger.debug(`${provider} API key retrieved successfully (first 4 chars: ${apiKey?.slice(0, 4)}...)`);
    return apiKey;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("No password found")) {
        logger.debug(`No ${provider} API key found in keyring`);
        return null;
      }
      logger.error(`Failed to retrieve ${provider} API key:`, {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    } else {
      logger.error(`Unknown error while retrieving ${provider} API key:`, error);
    }
    return null;
  }
}

export function deleteAPIKey(modelId: string): boolean {
  try {
    const provider = getProviderFromModel(modelId);
    logger.debug(`Attempting to delete ${provider} API key`);
    const entry = getEntryForProvider(provider);
    entry.deletePassword();
    logger.debug(`${provider} API key deleted successfully`);
    return true;
  } catch (error) {
    logger.error(`Failed to delete ${modelId} API key:`, error);
    if (error instanceof Error) {
      logger.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }
    return false;
  }
}

// Add this function to check system keyring status
export function getKeyringDiagnostics(): string {
  try {
    const diagnostics = [
      `Platform: ${keyring.platform()}`,
      `Process UID: ${process.getuid?.()}`,
      `Process GID: ${process.getgid?.()}`,
      `Service Name: ${SERVICE_NAME}`,
      `Node Version: ${process.version}`,
      `Operating System: ${process.platform}`,
    ];

    // Try to list available keyring services if possible
    if (process.platform === "linux") {
      // On Linux, we might want to check for common keyring services
      const services = ["gnome-keyring", "kwallet", "pass", "secret-service"];
      diagnostics.push("Available keyring services:");
      for (const service of services) {
        try {
          const testEntry = new Entry(service + "-test", "test");
          testEntry.setPassword("test");
          testEntry.deletePassword();
          diagnostics.push(`  ✓ ${service}`);
        } catch {
          diagnostics.push(`  ✗ ${service}`);
        }
      }
    }

    return diagnostics.join("\n");
  } catch (error) {
    return `Failed to get keyring diagnostics: ${error}`;
  }
}
