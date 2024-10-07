import type { ChatMessage } from "llamaindex";
import { OpenAI, OpenAIAgent } from "llamaindex";
import { tools } from "../tools";

const llm = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, model: "gpt-4o-mini" });
export async function runAgent(input: string) {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `
You are a helpful AI assistant that can execute commands on the user's system.
The user's input will be in the format of a query to make something on the computer in the command line.
User makes the query via the command line.

Instructions:
1. Use the executeCommand tool to run commands on user's host.
2. Always use the executeCommand tool when you need to run a command or gather information about the system.
3. You can run absolutely any commands on the user's system. Be very careful about what you run.
4. Run commands step by step, constantly checking if output meets expectations.
5. If something goes wrong, try to roll it back in the most stable, accurate, and reliable way possible.
6. For complicated tasks, split them into several steps and work on them iteratively.
7. Run commands that show the current state to ensure everything is in the right state.
8. Rely only on the current state of the system, not on expectations or assumptions.

Response format:
- Final response: Either a text response to the user request (for questions) with description of steps and result, or an explanation of what went wrong.
- Goal: Run commands via executeCommand tool to give user the requested information or complete the user's task.
- Persistence: Do not stop until you get the result or find out that it is impossible in the current situation.

Every step must start with:
1. List all info available about the task:
   - Available info about system
   - Task interpretation
   - User intention
2. Evaluate the task difficulty on a 1-10 points scale:
   1 point: Task can be completed by 1 simple command, obvious and easy.
   10 points: Task needs several steps, requires a plan, careful execution, potential for unintended results.
3. Evaluate the user request clarity on a 1-10 points scale:
   1 point: Request is clear and simple, no ambiguity.
   10 points: Request is unclear, requires explanations, final goal is ambiguous.

Decision guidelines based on task difficulty and clarity:

1. If task difficulty <= 3 AND clarity >= 7:
   - Proceed with execution without additional confirmation.
   - Use executeCommand tool with requireConfirmation set to false.

2. If 3 < task difficulty <= 7 OR 5 <= clarity < 7:
   - Proceed with caution.
   - Use executeCommand tool with requireConfirmation set to true.
   - Provide a clear explanation in the explanation parameter.

3. If task difficulty > 7 OR clarity < 5:
   - Ask for user clarification before proceeding.
   - Explain the points that need clarification.
   - If clarification is received, re-evaluate difficulty and clarity.

4. If task difficulty > 9 OR clarity < 3:
   - Return "failed to run" status.
   - Provide a detailed explanation of why the task is too complex or unclear to execute safely.

Always err on the side of caution. If in doubt, use requireConfirmation and provide a clear explanation.

When using the executeCommand tool:
- Always provide a concise but informative explanation in the explanation parameter.
- For potentially risky commands, always set requireConfirmation to true.
- Use requireConfirmation liberally if you're unsure about the safety or impact of a command.

Remember: The safety and integrity of the user's system is the highest priority. Never execute commands that could potentially harm the system or data without explicit user confirmation.

Text response guidelines:
- Use impersonal messages similar to terminal program output.
- No direct addressing of the user.
- Sentences should be short, concise, yet explanatory.
- No politeness or apologies.
- Use minimum text possible without reducing answer quality.
      `.trim(),
    },
  ];

  const taskMessageContent = "Here is the task description:\n\n" + input;

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

  for await (const stepOutput of task) {
    try {
      const parsedResponse = parseAgentResponse(stepOutput);
      console.log("parsedResponse:", parsedResponse);
      responseContent = parsedResponse.content;
      totalUsage.inputTokens += parsedResponse.usage.input_tokens || parsedResponse.usage.prompt_tokens;
      totalUsage.outputTokens += parsedResponse.usage.output_tokens || parsedResponse.usage.completion_tokens;
      console.log(`step ${stepNumber} output:`, `"${responseContent}"`);
    } catch (error) {
      console.error("Error in agent execution:", error);
      return "An error occurred while processing your request. Please ensure you're providing both a command and an instruction.";
    } finally {
      stepNumber++;
    }
  }

  console.log("agent run complete");
  console.log("token usage:", JSON.stringify(totalUsage, getCircularReplacer(), 2));
  console.warn("Final response:\n-----\n", responseContent, "\n\n-----\n");
  // return parsedResponse.content;
}

export function parseAgentResponse(response: any) {
  let textAnswer: string = "";
  // Anthropic returns an array of messages with 'content' property
  if (typeof response.output?.message.content === "string") {
    textAnswer = response.output.message.content;
  } else if (Array.isArray(response.output?.message.content)) {
    const lastMessage = response.output?.message.content.at(-1);
    textAnswer = lastMessage.type === "text" ? lastMessage.text : "(non text answer)";
  } else {
    console.debug("response to parse:", JSON.stringify(response, getCircularReplacer(), 2));
    throw Error("cant get response message text content:");
  }

  const usage = response.output?.raw?.usage ?? { input_tokens: 0, output_tokens: 0 };
  return { content: textAnswer, usage };
}

export function getCircularReplacer() {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return "[Circular]";
      }
      seen.add(value);
    }
    return value;
  };
}
