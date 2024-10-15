import { Entry } from "@napi-rs/keyring";

const SERVICE_NAME = "AIConsoleAgent";
const ACCOUNT_NAME = "OpenAIAPIKey";

const entry = new Entry(SERVICE_NAME, ACCOUNT_NAME);

export function storeAPIKey(apiKey: string): void {
  try {
    entry.setPassword(apiKey);
  } catch (error) {
    console.error("Failed to store API key:", error);
    throw new Error("Failed to securely store the API key");
  }
}

export function getAPIKey(): string | null {
  try {
    entry.getPassword();
  } catch (error) {
    if (error instanceof Error && error.message.includes("No password found")) {
      return null;
    }
    console.error("Failed to retrieve API key:", error);
    return null;
  }
  return null;
}

export function deleteAPIKey(): boolean {
  try {
    entry.deletePassword();
    return true;
  } catch (error) {
    console.error("Failed to delete API key:", error);
    return false;
  }
  false;
}
