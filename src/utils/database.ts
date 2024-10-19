import { Database } from "bun:sqlite";
import { Document } from "llamaindex";
import path from "path";
import { logger } from "./logger";

const DB_PATH = path.join(
  process.env.HOME || process.env.USERPROFILE || "",
  ".ai-console-agent",
  "chat_history.db",
);

export async function initializeDatabase(): Promise<Database> {
  const db = new Database(DB_PATH, { create: true });

  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_query TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      user_feedback TEXT,
      total_time INTEGER
    );

    CREATE TABLE IF NOT EXISTS agent_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      step_number INTEGER NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      execution_time INTEGER NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations (id)
    );

    CREATE TABLE IF NOT EXISTS tool_uses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      step_id INTEGER NOT NULL,
      tool_name TEXT NOT NULL,
      input_params TEXT NOT NULL,
      output TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      execution_time INTEGER NOT NULL,
      FOREIGN KEY (step_id) REFERENCES agent_steps (id)
    );
  `);

  return db;
}

export interface Conversation {
  id: number;
  user_query: string;
  timestamp: number;
  user_feedback?: string;
  total_time?: number;
}

export interface AgentStep {
  id: number;
  conversation_id: number;
  step_number: number;
  content: string;
  timestamp: number;
  execution_time: number;
}

export interface ToolUse {
  id: number;
  step_id: number;
  tool_name: string;
  input_params: string;
  output: string;
  timestamp: number;
  execution_time: number;
}

export async function insertConversation(db: Database, userQuery: string): Promise<number> {
  logger.debug(`Inserting conversation: ${userQuery}`);
  const timestamp = Date.now();
  const result = db.run("INSERT INTO conversations (user_query, timestamp) VALUES (?, ?)", [
    userQuery,
    timestamp,
  ]);
  return Number(result.lastInsertRowid);
}

export async function insertAgentStep(
  db: Database,
  conversationId: number,
  stepNumber: number,
  content: string,
  executionTime: number,
): Promise<number> {
  logger.debug(`Inserting agent step: ${stepNumber} for conversation ${conversationId}`);
  const timestamp = Date.now();
  const result = db.run(
    "INSERT INTO agent_steps (conversation_id, step_number, content, timestamp, execution_time) VALUES (?, ?, ?, ?, ?)",
    [conversationId, stepNumber, content, timestamp, executionTime],
  );
  return Number(result.lastInsertRowid);
}

export async function insertToolUse(
  db: Database,
  stepId: number,
  toolName: string,
  inputParams: string,
  output: string,
  executionTime: number,
): Promise<number> {
  const timestamp = Date.now();
  const result = db.run(
    "INSERT INTO tool_uses (step_id, tool_name, input_params, output, timestamp, execution_time) VALUES (?, ?, ?, ?, ?, ?)",
    [stepId, toolName, inputParams, output, timestamp, executionTime],
  );
  return Number(result.lastInsertRowid);
}

export async function getConversation(
  db: Database,
  conversationId: number,
): Promise<Conversation | undefined> {
  return db.query("SELECT * FROM conversations WHERE id = ?").get(conversationId) as Conversation | undefined;
}

export async function getAllConversations(db: Database): Promise<Conversation[]> {
  return db.query("SELECT * FROM conversations ORDER BY timestamp DESC").all() as Conversation[];
}

export async function updateUserFeedback(
  db: Database,
  conversationId: number,
  feedback: string,
): Promise<void> {
  db.run("UPDATE conversations SET user_feedback = ? WHERE id = ?", [feedback, conversationId]);
}

export async function updateConversationTotalTime(
  db: Database,
  conversationId: number,
  totalTime: number,
): Promise<void> {
  db.run("UPDATE conversations SET total_time = ? WHERE id = ?", [totalTime, conversationId]);
}

export async function createDocumentFromConversation(
  db: Database,
  conversationId: number,
): Promise<Document> {
  const conversation = await getConversation(db, conversationId);
  if (!conversation) {
    throw new Error(`Conversation with id ${conversationId} not found`);
  }

  const steps = db
    .query("SELECT content, is_user FROM agent_steps WHERE conversation_id = ? ORDER BY timestamp")
    .all(conversationId) as { content: string; is_user: number }[];

  const text = steps.map((step) => `${step.is_user ? "User" : "AI"}: ${step.content}`).join("\n");

  return new Document({
    text,
    id_: conversationId.toString(),
    metadata: {
      user_query: conversation.user_query,
      timestamp: conversation.timestamp,
      user_feedback: conversation.user_feedback,
      total_time: conversation.total_time,
    },
  });
}

export async function printDatabaseContents(db: Database) {
  logger.info("Current database contents:");
  const conversations = await getAllConversations(db);
  logger.info(`Total conversations: ${conversations.length}`);
  for (const conv of conversations) {
    logger.info(`Conversation ID: ${conv.id}, Query: ${conv.user_query}, Timestamp: ${conv.timestamp}`);
  }
}

export async function insertMessage(
  db: Database,
  conversationId: number,
  content: string,
  isUser: boolean,
): Promise<number> {
  const timestamp = Date.now();
  const result = db.run(
    "INSERT INTO agent_steps (conversation_id, step_number, content, timestamp, execution_time, is_user) VALUES (?, ?, ?, ?, ?, ?)",
    [conversationId, 0, content, timestamp, 0, isUser ? 1 : 0],
  );
  return Number(result.lastInsertRowid);
}

export { Database };
