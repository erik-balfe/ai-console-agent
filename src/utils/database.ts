import { Database } from "bun:sqlite";
import { Document } from "llamaindex";
import path from "path";
import { logger } from "./logger";

const DB_PATH = path.join(
  process.env.HOME || process.env.USERPROFILE || "",
  ".ai-console-agent",
  "chat_history.db",
);

export interface AgentStep {
  id: number;
  conversation_id: number;
  step_number: number;
  content: string;
  timestamp: number;
  execution_time: number;
  role: string;
}

export async function initializeDatabase(): Promise<Database> {
  const db = new Database(DB_PATH, { create: true });

  db.exec(`
    CREATE TABLE IF NOT EXISTS db_version (
      version INTEGER PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_query TEXT NOT NULL,
      timestamp BIGINT NOT NULL,
      user_feedback TEXT,
      total_time INTEGER
    );

    CREATE TABLE IF NOT EXISTS agent_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      step_number INTEGER NOT NULL,
      content TEXT NOT NULL,
      timestamp BIGINT NOT NULL,
      execution_time INTEGER NOT NULL,
      role TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations (id)
    );

    CREATE TABLE IF NOT EXISTS tool_uses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,  // New column for conversation ID
      step_id INTEGER NOT NULL,
      tool_name TEXT NOT NULL,
      input_params TEXT NOT NULL,
      output TEXT NOT NULL,
      timestamp BIGINT NOT NULL,
      execution_time INTEGER NOT NULL,
      FOREIGN KEY (step_id) REFERENCES agent_steps (id),
      FOREIGN KEY (conversation_id) REFERENCES conversations (id) // Enforce foreign key relationship
    );
  `);

  await migrateDatabase(db);

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
  role: string,
): Promise<number> {
  logger.debug(
    `Inserting agent step: ${stepNumber} for conversation ${conversationId}, execution time: ${executionTime}ms`,
  );
  const timestamp = Date.now();
  const result = db.run(
    "INSERT INTO agent_steps (conversation_id, step_number, content, timestamp, execution_time, role) VALUES (?, ?, ?, ?, ?, ?)",
    [conversationId, stepNumber, content, timestamp, executionTime, role],
  );
  return Number(result.lastInsertRowid);
}
export interface InsertToolUseParams {
  conversationId: number;
  stepId: number;
  toolName: string;
  inputParams: string;
  output: string;
  executionTime: number;
  timestamp: number;
}

export async function insertToolUse(
  db: Database,
  conversationId: number,
  stepId: string,
  toolName: string,
  inputParams: string,
  output: string,
  executionTime: number,
  timestamp: number,
): Promise<number> {
  const result = db.run(
    "INSERT INTO tool_uses (conversation_id, step_id, tool_name, input_params, output, timestamp, execution_time) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [conversationId, stepId, toolName, inputParams, output, timestamp, executionTime],
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
    .query("SELECT content, role FROM agent_steps WHERE conversation_id = ? ORDER BY timestamp")
    .all(conversationId) as { content: string; role: string }[];

  const text = steps.map((step) => `${step.role}: ${step.content}`).join("\n");

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
  logger.debug("Current database contents:");
  const conversations = await getAllConversations(db);
  logger.debug(`Total conversations: ${conversations.length}`);
  for (const conv of conversations) {
    logger.debug(`Conversation ID: ${conv.id}, Query: ${conv.user_query}, Timestamp: ${conv.timestamp}`);
  }
}

export async function insertMessage(
  db: Database,
  conversationId: number,
  content: string,
  role: string,
): Promise<number> {
  const timestamp = Date.now();
  const result = db.run(
    "INSERT INTO agent_steps (conversation_id, step_number, content, timestamp, execution_time, role) VALUES (?, ?, ?, ?, ?, ?)",
    [conversationId, 0, content, timestamp, 0, role],
  );
  return Number(result.lastInsertRowid);
}

export { Database };

export async function migrateDatabase(db: Database): Promise<void> {
  try {
    const currentVersion = db.query("SELECT version FROM db_version").get() as
      | { version: number }
      | undefined;

    if (!currentVersion) {
      // New database, set to latest version
      db.run("INSERT INTO db_version (version) VALUES (?)", [1]);
      logger.debug("Initialized new database with version 1");
      return;
    }

    if (currentVersion.version < 1) {
      logger.debug("Migrating database to version 1");
      db.exec(`
        ALTER TABLE conversations RENAME COLUMN timestamp TO old_timestamp;
        ALTER TABLE conversations ADD COLUMN timestamp BIGINT;
        UPDATE conversations SET timestamp = old_timestamp * 1000;
        ALTER TABLE conversations DROP COLUMN old_timestamp;

        ALTER TABLE agent_steps RENAME COLUMN timestamp TO old_timestamp;
        ALTER TABLE agent_steps ADD COLUMN timestamp BIGINT;
        UPDATE agent_steps SET timestamp = old_timestamp * 1000;
        ALTER TABLE agent_steps DROP COLUMN old_timestamp;

        ALTER TABLE tool_uses RENAME COLUMN timestamp TO old_timestamp;
        ALTER TABLE tool_uses ADD COLUMN timestamp BIGINT;
        UPDATE tool_uses SET timestamp = old_timestamp * 1000;
        ALTER TABLE tool_uses DROP COLUMN old_timestamp;
      `);

      db.run("UPDATE db_version SET version = 1");
      logger.debug("Database successfully migrated to version 1");
    }

    // Add future migrations here
    // if (currentVersion.version < 2) { ... }
  } catch (error) {
    logger.error("Error during database migration:", error);
    throw error;
  }
}
