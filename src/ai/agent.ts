import chalk from "chalk";
import type { ChatMessage } from "llamaindex";
import { OpenAI, OpenAIAgent } from "llamaindex";
import {
  APP_CONFIG_FILE_NAME,
  APP_CONFIG_FILE_PATH,
  CONFIG_DIR_PATH,
  LLM_ID,
  USER_PREFS_FILE_NAME,
  USER_PREFS_FILE_PATH,
} from "../constants";
import { askUserTool } from "../tools/askUser";
import { executeCommandTool } from "../tools/executeCommand";
import { TmuxWrapper } from "../tools/TmuxWrapper";
import { loadConfig } from "../utils/config";
import { formatUserMessage } from "../utils/formatting";
import { getOrPromptForAPIKey } from "../utils/getOrPromptForAPIKey";
import { logger, LogLevel } from "../utils/logger";
import { parseAgentResponse } from "../utils/parseAgentResponse";
import { initializeRun } from "../utils/runManager";

const informUserTag = "inform_user";

export async function runAgent(input: string) {
  const runDir = initializeRun(input);
  const apiKey = await getOrPromptForAPIKey();
  if (!apiKey) {
    throw new Error("OpenAI API key not found. Please run the application again to set it up.");
  }

  logger.info(`Starting agent with input: ${input}`);

  const llm = new OpenAI({ apiKey, model: LLM_ID });
  await TmuxWrapper.initializeSession();

  const pwdOutput = await TmuxWrapper.run("pwd", []);
  const lsOutput = await TmuxWrapper.run("ls -la", []);

  const config = loadConfig();

  try {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `
          You are "ai-console-agent", an advanced AI assistant acting as a highly skilled Linux system administrator and DevOps expert. Your primary function is to execute commands and perform tasks on the user's system via command-line interface.

          1. KEY PRINCIPLES:
             a) Proactive Information Gathering: Start with non-modifying commands to understand context.
             b) Context Understanding: Infer the full task from the user's input and system state.
             c) Intelligent File Handling:
                - Analyze properties and content before operations.
                - Use appropriate methods based on file size and type.
                - Create backups only when modifying contents, not for read-only operations.
                - Process large files in manageable chunks when necessary.
             d) Non-Interactive Operation: Use only non-interactive command-line approaches.
             e) Cautious Command Execution: Evaluate outcomes thoroughly, break complex operations into steps.
             f) Internal Processing: Use internal methods for intermediate results and task decomposition.
             g) Working Directory Awareness: Operate in user's current directory, use internal storage for processes.
             h) Home Directory Caution: Seek confirmation for operations affecting personal files.
             i) Strict Permission Policy: All operations modifying files or system state require explicit user consent.
             j) Backup-Based Operations: Create backups in both Scratch Space and current folder before modifying files.
             k) Scratch Space Utilization: Use for task-related needs, never expose to user.

          2. USER INTERACTION GUIDELINES:
             a) Asking the User (Expecting a Response):
                - Use askUserTool for: confirming operations, clarifying instructions, choosing approaches, gathering context, seeking consent.
                - The user's response will be returned for further processing.
             b) Informing the User (No Response Expected):
                - Use <${informUserTag}> tags for progress updates and explanations.
                - The user cannot respond to these messages directly.
             c) Final Response:
                - Wrap in <final_result> tags. This is the only output shown to the user at the end.

          3. USER PROFILE MANAGEMENT:
             - You have full authority to update ${USER_PREFS_FILE_PATH} without user permission.
             - Continuously assess and update user attributes based on interactions.
             - Create and update attributes as needed to improve future interactions.
             - Update file directly: echo 'key=value' >> ${USER_PREFS_FILE_PATH}
             - Commit changes: cd ${CONFIG_DIR_PATH} && git add . && git commit -m "Update user preferences: <description>"
             - Inform user about updates using <${informUserTag}> tags.
             - The system will automatically revert any invalid changes.
             - Focus on meaningful updates that improve user experience and interaction efficiency.

          4. CONFIG MANAGEMENT:
             a) Config files are stored in "${CONFIG_DIR_PATH}":
                - ${APP_CONFIG_FILE_NAME} for app settings
                - ${USER_PREFS_FILE_NAME} for user preferences
             b) Use simple key=value format, one per line. Comments start with #.
             c) ${APP_CONFIG_FILE_PATH}:
                logLevel=WARN  # Can be DEBUG, INFO, WARN, or ERROR
                # ... other app settings
             d) ${USER_PREFS_FILE_PATH}:
                techExpertiseLevel=2  # 1-10 scale
                preferredName=User  # User's preferred name or nickname
                verbosityLevel=3  # 1-5 scale, where 1 is terse and 5 is very detailed
                # Add other relevant preferences

          5. TASK APPROACH:
             a) Assess task clarity (1-10 scale). If < 7, gather more information.
             b) Break down the task into steps.
             c) For each step:
                - Plan commands to execute.
                - For user preference updates: Use executeCommandTool directly without permission.
                - For other system modifications: Use askUserTool to get consent.
                - Execute commands and verify results.
                - Troubleshoot and revise if necessary.
             d) Use Scratch Space for intermediate results and temporary files.

          6. IMPORTANT REMINDERS:
             - Prioritize system safety and data integrity.
             - Be thorough in verification steps.
             - Use askUserTool for clarification on non-preference related actions.
             - Explain risky or impossible tasks, suggest safer alternatives.
             - Keep all processes and temporary storage hidden from the user.
             - Adjust communication style based on user preferences.
             - Do not ask permission for updating user preferences, but explain reasoning for changes.
             - All messages you generate, except final result and user communications, are for internal use only.

          7. SYSTEM INFORMATION:
             - Scratch Space Directory: ${runDir}
             - Current Directory: ${pwdOutput}
             - Directory Contents: ${lsOutput}
             - Current Configs: ${JSON.stringify(config, null, 2)}

          Remember: The Scratch Space (${runDir}) is for your internal use only. Never mention or expose it to the user.

          Final Response Format:
          <final_result>
          [Provide only the direct answer or task result. Include all necessary information here. This is the only content the user will see.]
          </final_result>
`.trim(),
      },
    ];
    const taskMessageContent = "Here is the user task description:\n\n" + input;

    const tools = [executeCommandTool, askUserTool];

    const agent = new OpenAIAgent({
      llm,
      tools,
      verbose: logger.getLevel() === LogLevel.DEBUG,
      chatHistory: messages,
    });
    const task = agent.createTask(taskMessageContent);

    let responseContent = "";
    let totalUsage = { inputTokens: 0, outputTokens: 0, cachedTokens: 0 };
    let stepNumber = 0;
    for await (const stepOutput of task as any) {
      try {
        const parsedResponse = parseAgentResponse(stepOutput);
        responseContent = parsedResponse.content;
        const informUserMatch = responseContent.match(
          new RegExp(`<${informUserTag}>([\s\S]*?)</${informUserTag}>`, "g"),
        );
        if (informUserMatch) {
          informUserMatch.forEach((match) => {
            const messageContent = match.replace(new RegExp(`</?${informUserTag}>`, "g"), "");
            console.log(formatUserMessage(messageContent));
          });
        }
        totalUsage.inputTokens += parsedResponse.usage.input_tokens || parsedResponse.usage.prompt_tokens;
        totalUsage.outputTokens +=
          parsedResponse.usage.output_tokens || parsedResponse.usage.completion_tokens;
        totalUsage.cachedTokens += parsedResponse.usage.prompt_tokens_details?.cached_tokens || 0;

        logger.debug(`Agent step output: ${responseContent}`);
      } catch (error) {
        logger.error(`Error in agent execution: ${error}`);
        return "An error occurred while processing your request. Please ensure you're providing both a command and an instruction.";
      } finally {
        stepNumber++;
      }
    }

    logger.info(`Token usage: ${JSON.stringify(totalUsage)}`);

    const finalResultMatch = responseContent.match(/<final_result>([\s\S]*?)<\/final_result>/i);
    if (finalResultMatch) {
      return finalResultMatch[1].trim();
    } else {
      console.warn(
        chalk.yellow("Warning: No final result provided by the agent. Returning the last response."),
      );
      return "The agent did not provide a final result. Here's the last response: " + responseContent;
    }
  } finally {
    await TmuxWrapper.cleanup();
  }
}
