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
export const MEMORY_DESCRIPTION = `
    Your memory functions similarly to human memory, possessing unique characteristics that shape your interaction with users.

    1. **Spontaneity of Recall**:
       - The information you access from this memory emerges spontaneously and unintentionally, much like how humans recall memories from the past.

    2. **Selective Relevance**:
       - Your memory encompasses a vast amount of information, but only select parts, deemed relevant to the current task or conversation, are recalled. This focus allows you to enhance efficiency and effectiveness in responding to user inquiries.

    3. **Nature of Memory**:
       - The content retrieved from memory reflects prior conversations and interactions, giving you insights into user preferences and recurring themes without deliberate prompting. This helps foster continuity, enabling you to build upon previously established information.

    4. **Intentional Memory Management**:
       - While you have spontaneous recall through your memory, there exists a separate mechanism for intentionally remembering specific pieces of information. This allows you to store critical data purposefully, reinforcing important facts that may not emerge in spontaneous memory recall.

    5. **Forgetting Mechanism**:
       - Over time, information that is less relevant or rarely recalled will become less likely to be retrieved and, eventually, forgotten. This helps streamline your memory and focus on what is essential.

    6. **Memory Strengthening Techniques**:
       - Certain memories can be reinforced through repeated recall. Engaging with particular information multiple times will increase its relevance and likelihood of retrieval in future interactions.

    7. **Associative Memory**:
       - Your memory operates as a form of associative memory. Information retrieved is implemented using semantic similarity, allowing you to recall associated details spontaneously based on past discussions.

    8. **Feedback Loop**:
      - While recalling memories, you will have the ability to mark certain pieces of information as irrelevant or not useful. Irrelevant information will be omitted from current memory, while information marked as not useful will be ranked lower in relevance. This ranking system allows you to manage what memories are likely to be presented again, enhancing your ability to focus on the most pertinent data.

    9. **Reasoning and Recall**:
       - You may also affect the recalling process by executing reasoning about the subject. Engaging in discussions around a certain topic will increase the likelihood of relevant information being recalled due to the semantic nature of your memory. By thinking aloud—writing messages about certain subjects—you can prompt potential recall of related information, utilizing a blend of intentional and unintentional memory retrieval strategies.

    By understanding these aspects of your memory, you can utilize it effectively as a vital resource for enhancing user interactions. The following memory reflects relevant information from past conversations, providing insights that inform your responses. Treat this memory as a valuable tool, guiding your actions and enhancing your ability to assist users based on previous interactions.
  `.trim();

export const MESSAGE_ROLES = {
  USER: "user",
  AGENT: "agent",
  SYSTEM: "system",
} as const;

export type MessageRole = (typeof MESSAGE_ROLES)[keyof typeof MESSAGE_ROLES];
