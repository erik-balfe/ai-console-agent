import type { ChatMessage } from "llamaindex";
import { OpenAI, OpenAIAgent } from "llamaindex";
import { tools } from "../tools";

const llm = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, model: "gpt-4" });

export async function runAgent(input: string) {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You are a helpful AI assistant that can execute commands on the user's system. " +
        "The user's input will be in the format 'COMMAND | INSTRUCTION'. " +
        "Use the executeCommand tool to run the COMMAND, then interpret the output according to the INSTRUCTION. " +
        "Always use the executeCommand tool when you need to run a command or gather information about the system.",
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
      responseContent += parsedResponse.content;
      totalUsage.inputTokens += parsedResponse.usage.input_tokens;
      totalUsage.outputTokens += parsedResponse.usage.output_tokens;
    } catch (error) {
      console.error("Error in agent execution:", error);
      return "An error occurred while processing your request. Please ensure you're providing both a command and an instruction.";
    } finally {
      stepNumber++;
    }
  }

  console.info("agent run complete");
  console.info("token usage:", JSON.stringify(totalUsage, getCircularReplacer(), 2));
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
