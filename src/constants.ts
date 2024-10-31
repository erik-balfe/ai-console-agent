import path from "path";

export const LLM_ID = "gpt-4o-mini";
export const OPENAI_API_KEY_PROMPT = "Please enter your OpenAI API key: ";

export const AI_CONSOLE_AGENT_DIR = "/tmp/ai-console-agent";
export const CURRENT_RUN_FILE_NAME = "current_run_id.txt";

export const MAX_INPUT_LENGTH = 10000;
export const AGENT_CONTEXT_ALLOCATION = "60000"; // New constant for agent context allocation

export const CONFIG_DIR_PATH = path.join(
  process.env.HOME || process.env.USERPROFILE || "",
  ".ai-console-agent",
);
export const APP_CONFIG_FILE_NAME = "app_config.json";
export const USER_PREFS_FILE_NAME = "user_preferences.json";
export const APP_CONFIG_FILE_PATH = path.join(CONFIG_DIR_PATH, APP_CONFIG_FILE_NAME);
export const USER_PREFS_FILE_PATH = path.join(CONFIG_DIR_PATH, USER_PREFS_FILE_NAME);
export const EMBEDDINGS_MODEL_ID = "text-embedding-3-small";
export const VECTOR_STORE_PATH = path.join(CONFIG_DIR_PATH, "vector_store");
