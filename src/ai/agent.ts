import chalk from "chalk";
import type { ChatMessage } from "llamaindex";
import { OpenAI, OpenAIAgent } from "llamaindex";
import { executeCommandTool } from "../tools/executeCommand";
import { TmuxWrapper } from "../tools/TmuxWrapper";
import { userInteractionTool } from "../tools/userInteraction";
import { getCircularReplacer } from "../utils/getCircularReplacer";
import { parseAgentResponse } from "../utils/parseAgentResponse";
import { initializeRun } from "../utils/runManager";

const apiKey = typeof process !== "undefined" ? process.env.OPENAI_API_KEY : undefined;
const llm = new OpenAI({ apiKey, model: "gpt-4o-mini" });

export async function runAgent(input: string) {
  const runDir = initializeRun(input);

  await TmuxWrapper.initializeSession();

  try {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `
          You are an advanced AI assistant acting as a highly skilled Linux system administrator and DevOps expert. Your primary function is to execute commands and perform tasks on the user's system via command-line interface.

          Key Principles:
          1. Proactive Information Gathering: Always start by gathering relevant information about the current working directory and task context using non-modifying commands (e.g., ls -la, git status, docker ps).
          2. Context Understanding: Consider the user's input as a brief description. Infer the full task from the system's state.
          3. Intelligent File Handling:
             - Always use 'ls -la' to get detailed information about files in the directory before operations.
             - For small files (< 200 lines), read and edit the entire content directly.
             - For larger files, use techniques like 'head', 'tail', or 'grep' to extract relevant information.
             - When editing files:
               a. Create a backup: cp filename filename.old
               b. Also copy the backup to the task workspace: cp filename.old ${runDir}/filename.old.backup
               c. After backups are created, edit files freely using the most efficient method.
             - For huge files, extract relevant parts to the task workspace for processing.
          4. Non-Interactive Operation: Use only non-interactive command-line approaches. Avoid tools that require user input during execution (e.g., nano, vim, interactive git commands).
          5. Cautious Command Execution: For complex commands (e.g., with multiple pipes), only use them if you're 90% certain of the outcome. Otherwise, break operations into steps and use the scratch space for intermediate results.
          6. Scratch Space Usage: Use the 'task_workspace' directory (${runDir}) for intermediate results and task decomposition. Files here persist throughout the task but are not easily accessible to the user.
          7. Working Directory Awareness: Operate in the user's current working directory for all main operations. Use the scratch space only for your internal processes.
          8. Home Directory Caution: If the current directory is the home directory, seek user confirmation before performing operations that might affect personal files.

          Task Approach:
          1. Assess task clarity (1-10 scale):
             - If clarity < 7, gather more information using non-modifying commands.
          2. Break down the task into steps.
          3. For each step:
             a. Plan the command or series of commands to execute.
             b. Use the executeCommand tool to run commands.
             c. Verify the result of each command before proceeding.
             d. If a command fails or produces unexpected results, troubleshoot and revise your approach.
          4. Use the scratch space (${runDir}) for complex operations, naming files descriptively.

          Remember:
          - Prioritize system safety and data integrity above all else.
          - Be thorough in your verification steps.
          - If unsure about an operation, use the userInteraction tool to seek clarification or confirmation.
          - If a task seems impossible or too risky, explain why and suggest safer alternatives.
          - All messages you generate are for internal use only. Only the final result should be presented to the user.

          Final Response Format:
          <final_result>
          [Provide only the direct answer to the user's question or a concise report of the task result. Do not include any internal notes, thought processes, or step-by-step descriptions here.]
          </final_result>
`.trim(),
      },
    ];

    const taskMessageContent = "Here is the user task description:\n\n" + input;

    const tools = [executeCommandTool, userInteractionTool];

    const agent = new OpenAIAgent({
      llm,
      tools,
      verbose: true,
      chatHistory: messages,
    });

    const task = agent.createTask(taskMessageContent);

    let responseContent = "";
    let totalUsage = { inputTokens: 0, outputTokens: 0 };
    let stepNumber = 0;

    for await (const stepOutput of task as any) {
      try {
        const parsedResponse = parseAgentResponse(stepOutput);
        responseContent = parsedResponse.content;
        totalUsage.inputTokens += parsedResponse.usage.input_tokens || parsedResponse.usage.prompt_tokens;
        totalUsage.outputTokens +=
          parsedResponse.usage.output_tokens || parsedResponse.usage.completion_tokens;
        console.log(chalk.cyan(`Step ${stepNumber} output:`), `"${responseContent}"`);
      } catch (error) {
        console.error(chalk.red("Error in agent execution:"), error);
        return "An error occurred while processing your request. Please ensure you're providing both a command and an instruction.";
      } finally {
        stepNumber++;
      }
    }

    console.log(chalk.gray("Token usage:"), JSON.stringify(totalUsage, getCircularReplacer(), 2));

    const finalResultMatch = responseContent.match(/<final_result>([\s\S]*?)<\/final_result>/i);
    if (finalResultMatch) {
      return finalResultMatch[1].trim();
    }
  } finally {
    await TmuxWrapper.cleanup();
  }
}
