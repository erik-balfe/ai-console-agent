import { config } from "dotenv";
import { runAgent } from "./ai/agent";
import { getPipedInput, parseArguments } from "./cli/interface";

config();

const MAX_INPUT_LENGTH = 4000; // Adjust this based on your needs

async function main() {
  const { command, input } = parseArguments(process.argv);


  let finalInput = input;
  if (command === "pipe") {
    const pipedInput = await getPipedInput();
    finalInput = `${input} ${pipedInput}`.trim();
  }

  if (finalInput) {
    console.log(`final input: ${finalInput}`);

    if (finalInput.length > MAX_INPUT_LENGTH) {
      console.error(`Input is too long. Please limit your input to ${MAX_INPUT_LENGTH} characters.`);
      return;
    }

    try {
      const agentResponse = await runAgent(finalInput);
      // console.log("Agent Response:", agentResponse);
    } catch (error) {
      console.error("Error running agent:", error);
    }
  } else {
    console.log("No input received. Please provide input for the agent.");
  }
}

main().catch(console.error);
