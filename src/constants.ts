import path from "path";
import { getUserHomeDir } from "./utils/getUserHomeDir";

export const API_KEY_PROMPTS = {
  OPENAI: "Please enter your OpenAI API key: ",
  GROQ: "Please enter your Groq API key: ",
  ANTHROPIC: "Please enter your Anthropic API key: ",
} as const;

export type APIProvider = keyof typeof API_KEY_PROMPTS;

export const API_KEY_PREFIXES = {
  OPENAI: "sk-",
  GROQ: "gsk_",
  ANTHROPIC: "sk-ant-",
} as const;

export const AI_CONSOLE_AGENT_DIR = "/tmp/ai-console-agent";
export const CURRENT_RUN_FILE_NAME = "current_run_id.txt";

export const MAX_INPUT_LENGTH = 10000;
export const AGENT_CONTEXT_ALLOCATION = "60000";

export const CONFIG_DIR_PATH = path.join(getUserHomeDir(), ".ai-console-agent");

export const APP_CONFIG_FILE_NAME = "app_config.json";
export const USER_PREFS_FILE_NAME = "user_preferences.json";
export const APP_CONFIG_FILE_PATH = path.join(CONFIG_DIR_PATH, APP_CONFIG_FILE_NAME);
export const USER_PREFS_FILE_PATH = path.join(CONFIG_DIR_PATH, USER_PREFS_FILE_NAME);
export const EMBEDDINGS_MODEL_ID = "text-embedding-3-small";
export const EMBEDDING_MODELS = [EMBEDDINGS_MODEL_ID];
export const VECTOR_STORE_PATH = path.join(CONFIG_DIR_PATH, "vector_store");

export const MESSAGE_ROLES = {
  USER: "user",
  AGENT: "assistant",
  SYSTEM: "system",
} as const;

export type MessageRole = (typeof MESSAGE_ROLES)[keyof typeof MESSAGE_ROLES];

export const AVAILABLE_MODELS = {
  gpt4oMini: "gpt-4o-mini",
  gpt4: "gpt-4o",
  claude35Sonnet: "claude-3-5-sonnet-latest",
  claude35Haiku: "claude-3-5-haiku-latest",
  llama: "llama3-groq-70b-8192-tool-use-preview",
};

// 4. **Intentional Memory Management**:
//        - While you have spontaneous recall through your memory, there exists a separate mechanism for intentionally remembering specific pieces of information. This allows you to store critical data purposefully, reinforcing important facts that may not emerge in spontaneous memory recall.

interface ModelPrice {
  input: number;
  output: number;
  inputCacheHit?: number;
}

interface AIModelConfig {
  id: string;
  friendlyName: string;
  maxContextSize: number;
  price: ModelPrice;
  supportsVision: boolean;
  functionCalling: boolean;
  knowledgeCutoff: string;
  priceDesc: string;
  default?: boolean;
}

export const MODELS: Record<string, AIModelConfig> = {
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    friendlyName: "openAIGpt4oMiniModel",
    maxContextSize: 128000,
    price: {
      input: 0.15 / 1000000,
      output: 0.6 / 1000000,
      inputCacheHit: 0.075 / 1000000,
    },
    priceDesc: "$0.26/1M tokens",
    supportsVision: true,
    functionCalling: true,
    knowledgeCutoff: "08.08.2024",
    default: false,
  },
  "gpt-4o": {
    id: "gpt-4o",
    friendlyName: "openAIGpt4oModel",
    maxContextSize: 128000,
    price: {
      input: 2.5 / 1000000,
      output: 10 / 1000000,
      inputCacheHit: 1.25 / 1000000,
    },
    priceDesc: "$4.38/1M tokens",
    supportsVision: true,
    functionCalling: true,
    knowledgeCutoff: "8.08.2024",
    default: false,
  },
  "claude-3-5-sonnet-latest": {
    id: "claude-3-5-sonnet-latest",
    friendlyName: "claude35Sonnet",
    maxContextSize: 200000,
    price: {
      input: 3 / 1000000,
      output: 15 / 1000000,
      inputCacheHit: 0.3 / 1000000,
    },
    priceDesc: "$6.00/1M tokens",
    supportsVision: true,
    functionCalling: true,
    knowledgeCutoff: "April 2024",
    default: false,
  },
  "claude-3-5-haiku-latest": {
    id: "claude-3-5-haiku-latest",
    friendlyName: "claude35Haiku",
    maxContextSize: 200000,
    price: {
      input: 1 / 1000000,
      output: 5 / 1000000,
      inputCacheHit: 0.1 / 1000000,
    },
    priceDesc: "$2.00/1M tokens",
    supportsVision: false,
    functionCalling: true,
    knowledgeCutoff: "July 2024",
    default: true,
  },
  "llama3-groq-70b-8192-tool-use-preview": {
    id: "llama3-groq-70b-8192-tool-use-preview",
    friendlyName: "openMediumToolCalling",
    maxContextSize: 8192,
    price: {
      input: 0.59 / 1000000,
      output: 0.79 / 1000000,
    },
    priceDesc: "$0.64/1M tokens",
    supportsVision: false,
    functionCalling: true,
    knowledgeCutoff: "Unknown",
    default: false,
  },
};

export interface ContextAllocationItem {
  maxTokens: number;
  assumedTokenSize: number;
  maxChars: number;
}

export interface ContextAllocation {
  memories: ContextAllocationItem;
  chatHistory: ContextAllocationItem;
  toolOutput: ContextAllocationItem;
}

export const CONTEXT_ALLOCATION = {
  memories: {
    maxTokens: 10000,
    assumedTokenSize: 4,
    maxChars: 40000,
  },
  chatHistory: {
    maxTokens: 15000,
    assumedTokenSize: 4,
    maxChars: 60000,
  },
  toolOutput: {
    maxTokens: 5000,
    assumedTokenSize: 4,
    maxChars: 20000,
  },
};

export const WEAK_MODEL_ID = "gpt-4o-mini";
