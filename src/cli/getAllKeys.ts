import { APIProvider } from "../constants";
import { getAPIKey } from "../utils/apiKeyManager";
import { debug } from "../utils/logger/Logger";

export function formatApiKey(key: string): string {
  if (!key) return "Not set";
  return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
}

export async function getAllStoredKeys(): Promise<Record<APIProvider, string | null>> {
  debug("Getting all stored API keys");
  const providers: APIProvider[] = ["OPENAI", "GROQ", "ANTHROPIC"];

  const keys: Record<APIProvider, string | null> = {} as Record<APIProvider, string | null>;

  for (const provider of providers) {
    debug(`Attempting to get API key for provider: ${provider}`);
    const key = await getAPIKey(provider);
    debug("key", key?.slice(0, 7));
    keys[provider] = key;
    debug(`Successfully retrieved API key for ${provider}`);
  }

  return keys;
}
