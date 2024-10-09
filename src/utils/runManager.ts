import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { AI_CONSOLE_AGENT_DIR, CURRENT_RUN_FILE_NAME } from "../constants";

export const RUN_ID_FILE = path.join(AI_CONSOLE_AGENT_DIR, CURRENT_RUN_FILE_NAME);

function generateDescriptiveName(input: string): string {
  // Remove special characters and convert to lowercase
  const sanitized = input.replace(/[^a-zA-Z0-9 ]/g, "").toLowerCase();
  // Take the first 5 words
  const words = sanitized.split(" ").slice(0, 5);
  // Join words with underscores
  return words.join("_");
}

export function initializeRun(taskDescription: string): string {
  const runId = uuidv4();
  const descriptiveName = generateDescriptiveName(taskDescription);
  const runDir = path.join(AI_CONSOLE_AGENT_DIR, `${descriptiveName}_${runId}`);

  if (!fs.existsSync(AI_CONSOLE_AGENT_DIR)) {
    fs.mkdirSync(AI_CONSOLE_AGENT_DIR, { recursive: true });
  }

  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(RUN_ID_FILE, runId);

  return runDir;
}

export function getRunDirectory(runId: string): string {
  return path.join(AI_CONSOLE_AGENT_DIR, `run-${runId}`);
}

export function getCurrentRunId(): string | null {
  if (!fs.existsSync(AI_CONSOLE_AGENT_DIR)) {
    fs.mkdirSync(AI_CONSOLE_AGENT_DIR, { recursive: true });
  }

  if (fs.existsSync(RUN_ID_FILE)) {
    return fs.readFileSync(RUN_ID_FILE, "utf-8").trim();
  }
  return null;
}

export function getFinalResult(runId: string): string | null {
  const finalResultPath = path.join(getRunDirectory(runId), "final_result.txt");
  if (fs.existsSync(finalResultPath)) {
    return fs.readFileSync(finalResultPath, "utf-8");
  }
  return null;
}
