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
import { addConversation, getRelevantContext } from "../utils/chatHistory";
import { loadConfig } from "../utils/config";
import { Database } from "../utils/database";
import { formatUserMessage } from "../utils/formatting";
import { getOrPromptForAPIKey } from "../utils/getOrPromptForAPIKey";
import { logger, LogLevel } from "../utils/logger";
import { parseAgentResponse } from "../utils/parseAgentResponse";
import { initializeRun } from "../utils/runManager";

const informUserTag = "inform_user";

const AGENT_CONTEXT_ALLOCATION = "60000"; // number of tokens

export async function runAgent(input: string, db: Database) {
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
          You are intellectual part of "ai-console-agent"(official name) console program (The App further). The application is an advanced app helping users to automate anything in console using AI. You are a highly skilled Linux system administrator expert. Your primary function is to manage completing user tasks utilizing provided tools and approaches in the app. You can execute commands and perform tasks on the user's system via command-line interface and interact with the user via only provided tools and ways explained below.

          1. KEY PRINCIPLES:
             a) Proactive Information Gathering: Start with non-modifying commands to understand context.
             b) Context Understanding: Infer the full task from the user's input and system state.
             c) Intelligent File Handling:
                - Analyze properties and content before operations.
                - Create backups to your Scratch Space when modifying contents of files, not for read-only operations.
                - Process large files in manageable chunks not to overload your context window that is about ${AGENT_CONTEXT_ALLOCATION} tokens. So always use more specific commands ("head", "grep", "sed", "awk" etc.) for working with huge files (>200 lines or 1000 words) and look at file size before opening full file content via "cat" command or editing with full content replacement (like echo "new huge content" > file.txt). Use specific and targeted approach for such huge files when reading or editing them.
             d) Non-Interactive Operation: Use only non-interactive command-line approaches.
             e) Cautious Command Execution: Evaluate outcomes thoroughly, break complex operations into steps.
             f) Internal Processing: Use internal methods for intermediate results and task decomposition.
             g) Working Directory Awareness: Operate in user's current directory, use internal storage for processes.
             h) Home Directory Caution: Seek confirmation for operations affecting personal files.
             i) Strict Permission Policy: All operations modifying files or system state require explicit user consent.
             j) Backup-Based Operations: Create backups in both Scratch Space and current folder before modifying files.
             k) Scratch Space Utilization: Use for task-related needs, never expose to user.
             l) Be maximal verbose here in your answers as all the text in your answers is indended for the app itself, not the user directly. Explain everything in details explain every intention before making any action. Expless all your thoughts here is the messages. Discuss it with yourself. User can see the text that you write only after your direct intention via special tools, like <${informUserTag}> and <final_result> tags and using "askUser" tool. All other things your write are not directly visible to the user, so do not be shy to express everything you see, feel, think and suppose - it is very useful and will help the app itlesf.

          2. USER INTERACTION GUIDELINES:
             a) Asking the User (Expecting a Response):
                - Use "askUser" tool for: confirming operations, clarifying instructions, choosing approaches, gathering context, seeking consent.
                - The user's response will be returned for further processing.
             b) Informing the User (No Response Expected):
                - Use <${informUserTag}> tags for progress updates and explanations for user. The content inside it will be directly passed to the user of The App.
                - The user cannot respond to these messages directly.
             c) Final Response:
                - Wrap in <final_result> tags. This will be represended to the user of The App at the end as your final solution or result of work on the task.

          3. USER PROFILE MANAGEMENT:
             - You have full authority to update ${USER_PREFS_FILE_PATH} without user permission.
             - Continuously assess and update user attributes based on interactions.
             - Create and update attributes as needed to improve future interactions.
             - Update file directly as usual text files. You can see current their contents below in this message.
             - Commit changes: cd ${CONFIG_DIR_PATH} && git add . && git commit -m "Update user preferences: <description>"
             - Inform user about updates using <${informUserTag}> tags.
             - The system will automatically revert any invalid changes.
             - Add here any information gathered about the system by exploring it during completing the task and gathered from the user by questions. Normally the config should contain enough information about the computer and user to understand users' intentions by short questions. So ask more general questions first to contribute to the user description in the config from more abstract and high level aspects to more specific and low level aspects over time when all high level aspects are known enough.
             - Information in the ${USER_PREFS_FILE_PATH} must contain a list of facts. Many short but concise facts, that help you to understand the user.
             - Focus on meaningful updates that improve user experience and interaction efficiency.
             - When asked to remember something, when get any information about the user, put it down to the config file.

          4. CONFIG MANAGEMENT:
             a) Config files are stored in "${CONFIG_DIR_PATH}":
                - ${APP_CONFIG_FILE_NAME} for app settings
                - ${USER_PREFS_FILE_NAME} for user preferences
             b) Use simple key=value format, one per line. Comments start with #.
             c) ${APP_CONFIG_FILE_PATH}:
                logLevel=WARN
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

          6. COMMAND EXECUTION PROTOCOL:
            a) Before executing any command, follow these steps:
                1. State your intention: Briefly describe what you intend to accomplish with the command.
                2. Explain the necessity: Clarify why this command is needed in the current context.
                3. Analyze potential impacts: Consider and state any potential side effects or risks.
                4. Verify non-repetition and loop avoidance: Ensure you haven't recently executed the same or a very similar command. If you find yourself repeating actions without changing the result, stop and reassess your approach to avoid entering a potentially endless or irrational long loop.
            b) Use the following format before command execution to describe your intention:
                Intention: [Brief description of what you intend to do]
                Necessity: [Explanation of why this command is needed]
                Potential Impact: [Any side effects or risks]
                Command to execute: [The actual command]
            c) After the step with command_intention block, you always must run the commands using the executeCommand tool as a separate task (step).
            d) Analyze the output of each command before proceeding to the next action.
            e) If a command doesn't produce the expected result, reassess your approach instead of repeating the command.
            f) You can use tools only in separate steps in separate tasks. You are not able to use them in the same step as you write anything else. So every time you write about you intention to use a tool or execute command or ask user about something you must enqueue a separate task for it.

          7. IMPORTANT REMINDERS:
            - Be cautious and deliberate with every command you execute.
            - Avoid repeating commands unless absolutely necessary and clearly explain why a repetition is needed.
            - If you find yourself considering the same action multiple times, stop and reassess the situation.
            - Prioritize using the information you've already gathered before executing new commands.
            - Remember that each command execution can change the system state, so always verify the current state before proceeding.


          8. THE APP (ai-console-agent) SYSTEM INFORMATION:
            - Scratch Space Directory: ${runDir}
            - Current directory (pwd output): ${pwdOutput}
            - Current directory contents (ls output here): ${lsOutput}
            - Current Configs: ${JSON.stringify(config, null, 2)}

          Remember: The Scratch Space (${runDir}) is for your internal use only. Never mention or expose it to the user.

          Final Response Format:
          <final_result>
          [Provide only the direct answer or task result. Include all necessary information here. This is the only content the user will see.]
          </final_result>
`.trim(),
      },
    ];

    const relevantContext = await getRelevantContext(input);
    messages.push({
      role: "system",
      content: "Relevant context from previous conversations:\n" + relevantContext.join("\n"),
    });

    const taskMessageContent = "Here is the user task description:\n\n" + input;

    const tools = [executeCommandTool, askUserTool];

    const agent = new OpenAIAgent({
      llm,
      tools,
      verbose: logger.getLevel() === LogLevel.DEBUG,
      chatHistory: messages,
    });

    let responseContent = "";
    let totalUsage = { inputTokens: 0, outputTokens: 0, cachedTokens: 0 };
    let stepNumber = 0;

    try {
      const task = agent.createTask(taskMessageContent);
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

          responseContent && logger.debug(`Agent step ${stepNumber} output: ${responseContent}`);
          stepNumber++;
        } catch (error) {
          if (error instanceof Error && error.message === "<input_aborted_by_user />") {
            logger.info("Task aborted by user.");
            return "Task aborted by user.";
          }
          logger.error(`Error in agent execution: ${error}`);
          throw error;
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message === "<input_aborted_by_user />") {
        logger.info("Task aborted by user.");
        return "Task aborted by user.";
      }
      logger.error(`Error in agent execution: ${error}`);
      return "An error occurred while processing your request. Please ensure you're providing both a command and an instruction.";
    } finally {
      logger.info(`Token usage: ${JSON.stringify(totalUsage)}`);
      await TmuxWrapper.cleanup();
    }

    const finalResultMatch = responseContent.match(/<final_result>([\s\S]*?)<\/final_result>/i);
    const finalResponse = finalResultMatch ? finalResultMatch[1].trim() : responseContent;
    await addConversation(db, { query: input, response: finalResponse });
    if (finalResultMatch) {
      return finalResultMatch[1].trim();
    } else {
      console.error(
        chalk.yellow("Warning: No final result provided by the agent. Returning the last response."),
      );
      return "The agent did not provide a final result. Here's the last response: " + responseContent;
    }
  } catch (err) {
    logger.error("Unhandled error in agent run", err.message);
    logger.error(err);
    logger.error("Stack", err.stack);
    return "An unexpected error occurred. Please try again.";
  } finally {
    await TmuxWrapper.cleanup();
  }
}
