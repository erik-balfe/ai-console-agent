import { config } from "dotenv";
import { OpenAI, SimpleDirectoryReader, VectorStoreIndex } from "llamaindex";
import { stdin } from "process";

// Load environment variables
config();

// Initialize LLM client
const llm = new OpenAI({ apiKey: process.env.LLM_API_KEY });

// Function to make a simple query to the LLM
async function queryLLM(input: string): Promise<string> {
  const serviceContext = ServiceContext.fromDefaults({ llm });
  const documents = await new SimpleDirectoryReader().loadData({ text: input });
  const index = await VectorStoreIndex.fromDocuments(documents, { serviceContext });
  const queryEngine = index.asQueryEngine();
  const response = await queryEngine.query(input);
  return response.toString();
}

function parseArguments(args: string[]): { command: string; flags: string[] } {
  const [, , ...cliArgs] = args;
  const command = cliArgs[0] || "";
  const flags = cliArgs.slice(1);
  return { command, flags };
}

async function getPipedInput(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    stdin.on("readable", () => {
      let chunk;
      while (null !== (chunk = stdin.read())) {
        data += chunk;
      }
    });
    stdin.on("end", () => {
      resolve(data.trim());
    });
  });
}

async function main() {
  const { command, flags } = parseArguments(process.argv);
  console.log(`Command: ${command}`);
  console.log(`Flags: ${flags.join(", ")}`);

  const pipedInput = await getPipedInput();
  if (pipedInput) {
    console.log(`Piped input: ${pipedInput}`);

    // Use the piped input to query the LLM
    try {
      const llmResponse = await queryLLM(pipedInput);
      console.log("LLM Response:", llmResponse);
    } catch (error) {
      console.error("Error querying LLM:", error);
    }
  } else {
    console.log("No piped input received. Please provide input to query the LLM.");
  }
}

main().catch(console.error);
