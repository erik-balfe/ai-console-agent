import { Database } from "bun:sqlite";
import path from "path";
import { MessageRole } from "../constants";
import { AgentMessage, ToolCall } from "./interface";
import { logger } from "./logger";

const DB_PATH = path.join(
  process.env.HOME || process.env.USERPROFILE || "",
  ".ai-console-agent",
  "chat_history.db",
);

export interface AgentStep {
  id: number;
  conversationId: number;
  stepNumber: number;
  content: string;
  timestamp: number;
  executionTime: number;
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
      userQuery TEXT NOT NULL,
      response TEXT,
      title TEXT DEFAULT '',
      timestamp BIGINT NOT NULL,
      userFeedback REAL DEFAULT 1,
      totalTime INTEGER,
      correctness REAL DEFAULT 1,
      faithfulness REAL DEFAULT 1,
      relevancy REAL DEFAULT 1,
      lastRetrieved INTEGER DEFAULT null,
      retrievalCount INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS agent_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversationId INTEGER NOT NULL,
      stepNumber INTEGER NOT NULL,
      content TEXT NOT NULL,
      timestamp BIGINT NOT NULL,
      executionTime INTEGER NOT NULL,
      role TEXT NOT NULL,
      FOREIGN KEY (conversationId) REFERENCES conversations (id)
    );

    CREATE TABLE IF NOT EXISTS tool_uses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversationId INTEGER NOT NULL,
      stepId INTEGER NOT NULL,
      toolName TEXT NOT NULL,
      inputParams TEXT NOT NULL,
      output TEXT NOT NULL,
      timestamp BIGINT NOT NULL,
      executionTime INTEGER NOT NULL,
      FOREIGN KEY (stepId) REFERENCES agent_steps (id),
      FOREIGN KEY (conversationId) REFERENCES conversations (id)
    );
  `);

  await migrateDatabase(db);

  return db;
}

export interface Conversation extends ConversationMetadata {
  id: number;
  userQuery: string;
  title: string;
  total_time: number;
}

export interface ConversationScores {
  userFeedback: number;
  correctness: number;
  faithfulness: number;
  relevancy: number;
}

export interface ConversationMetadata extends ConversationScores {
  timestamp: number;
  retrievalCount: number;
  lastRetrieved: number | null;
}

export interface ToolCallRecord {
  id: number;
  stepId: number;
  toolName: string;
  inputParams: string;
  output: string;
  timestamp: number;
  executionTime: number;
}

export async function insertConversation(
  db: Database,
  userQuery: string,
  startTime: number,
): Promise<number> {
  logger.debug(`Inserting conversation: ${userQuery}`);

  const result = db.run("INSERT INTO conversations (userQuery, timestamp) VALUES (?, ?)", [
    userQuery,
    startTime,
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
    "INSERT INTO agent_steps (conversationId, stepNumber, content, timestamp, executionTime, role) VALUES (?, ?, ?, ?, ?, ?)",
    [conversationId, stepNumber, content, timestamp, executionTime, role],
  );
  return Number(result.lastInsertRowid);
}

export interface ToolCallRecord extends ToolCall {
  conversationId: number;
  stepId: number;
}

export async function insertToolUse(
  db: Database,
  conversationId: number,
  stepId: number,
  toolName: string,
  inputParams: string,
  output: string,
  executionTime: number,
  timestamp: number,
): Promise<number> {
  const result = db.run(
    "INSERT INTO tool_uses (conversationId, stepId, toolName, inputParams, output, timestamp, executionTime) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [conversationId, stepId, toolName, inputParams, output, timestamp, executionTime],
  );
  return Number(result.lastInsertRowid);
}

export function getConversation(db: Database, conversationId: number): Conversation | undefined {
  return db.query("SELECT * FROM conversations WHERE id = ?").get(conversationId) as Conversation | undefined;
}

export function getAllConversations(db: Database): Conversation[] {
  return db.query("SELECT * FROM conversations ORDER BY timestamp DESC").all() as Conversation[];
}

export async function updateConversationFields(
  db: Database,
  {
    conversationId,
    title,
    totalTime,
    correctness,
    faithfulness,
    relevancy,
    retrievalCount,
    userFeedback,
    lastRetrieved,
    response,
  }: {
    conversationId: number;
    title: string;
    totalTime: number;
    userFeedback: number;
    correctness: number;
    faithfulness: number;
    relevancy: number;
    retrievalCount: number;
    lastRetrieved: number | null;
    response: string;
  },
): Promise<void> {
  db.run(
    "UPDATE conversations SET title = ?, totalTime = ?, correctness = ?, faithfulness = ?, relevancy = ?, retrievalCount = ?, lastRetrieved = ?, userFeedback = ?, response = ? WHERE id = ?",
    [
      title,
      totalTime,
      correctness,
      faithfulness,
      relevancy,
      retrievalCount,
      lastRetrieved,
      userFeedback,
      response,
      conversationId,
    ],
  );
  logger.info(`Conversation ID: ${conversationId} updated successfully with new fields.`);
}

export function printDatabaseContents(db: Database) {
  logger.debug("Current database contents:");
  const conversations = getAllConversations(db);
  logger.debug(`Total conversations: ${conversations.length}`);
  for (const conv of conversations) {
    logger.debug(
      `Conversation ID: ${conv.id}, Query: ${conv.userQuery}, Title: ${conv.title}, Timestamp: ${conv.timestamp}`,
    );
  }
}

export interface FullConversationData {
  messages: AgentMessage[];
  toolCalls: ToolCall[];
  conversationData: ConversationMetadata;
}

export function getAllConversationData(
  db: Database,
  conversationId: number,
): {
  messages: AgentMessage[];
  toolCalls: ToolCall[];
  conversationData: ConversationMetadata;
} {
  const conversationData = getConversation(db, conversationId);

  const steps = db
    .query("SELECT content, role, timestamp FROM agent_steps WHERE conversationId = ?")
    .all(conversationId) as Array<{ content: string; role: MessageRole; timestamp: number }>;

  const toolCalls = db
    .query(
      "SELECT toolName, inputParams, output, timestamp, executionTime FROM tool_uses WHERE conversationId = ?",
    )
    .all(conversationId) as Array<ToolCall>;

  const messages: AgentMessage[] = steps.map((step) => ({
    role: step.role,
    content: step.content,
    timestamp: step.timestamp,
  }));

  if (!conversationData) {
    throw new Error(`Conversation with ID ${conversationId} not found`);
  }

  return { messages, toolCalls, conversationData };
}

export async function insertMessage(
  db: Database,
  conversationId: number,
  content: string,
  role: string,
): Promise<number> {
  const timestamp = Date.now();
  const result = db.run(
    "INSERT INTO agent_steps (conversationId, stepNumber, content, timestamp, executionTime, role) VALUES (?, ?, ?, ?, ?, ?)",
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
      db.run("INSERT INTO db_version (version) VALUES (?)", [1]);
      logger.debug("Initialized new database with version 1");
      return;
    }

    // if (currentVersion.version < 2) {
    // logger.debug("Migrating database to version 2");

    // }
    // Add future migrations here
    // if (currentVersion.version < 2) { ... }
  } catch (error) {
    logger.error("Error during database migration:", error);
    throw error;
  }
}
