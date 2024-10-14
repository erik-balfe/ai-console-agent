import { Entry } from "@napi-rs/keyring";

const SERVICE_NAME = "AIConsoleAgent";
const ACCOUNT_NAME = "OpenAIAPIKey";

const entry = new Entry(SERVICE_NAME, ACCOUNT_NAME);

export async function storeAPIKey(apiKey: string): Promise<void> {
  try {
    await entry.setPassword(apiKey);
  } catch (error) {
    console.error("Failed to store API key:", error);
    throw new Error("Failed to securely store the API key");
  }
}

export async function getAPIKey(): Promise<string | null> {
  try {
    return await entry.getPassword();
  } catch (error) {
    if (error instanceof Error && error.message.includes("No password found")) {
      return null;
    }
    console.error("Failed to retrieve API key:", error);
    return null;
  }
}

export async function deleteAPIKey(): Promise<boolean> {
  try {
    await entry.deletePassword();
    return true;
  } catch (error) {
    console.error("Failed to delete API key:", error);
    return false;
  }
}
