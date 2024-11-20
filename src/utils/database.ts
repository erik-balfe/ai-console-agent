import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "path";
import { MessageRole } from "../constants";
import { getUserHomeDir } from "./getUserHomeDir";
import { AgentMessage, ToolCall } from "./interface";
import { logger } from "./logger";

const DB_PATH = path.join(getUserHomeDir(), ".ai-console-agent", "chat_history.db");

export interface AgentStep {
  id: number;
  conversationId: number;
  stepNumber: number;
  content: string;
  timestamp: number;
  duration: number;
  role: string;
}

const LATEST_DB_VERSION = 8;

export async function initializeDatabase(): Promise<Database> {
  const dbDir = path.dirname(DB_PATH);

  if (!existsSync(dbDir)) {
    try {
      await mkdir(dbDir, { recursive: true });
    } catch (error) {
      logger.error(`Failed to create database directory: ${error}`);
      throw error;
    }
  }

  try {
    const db = new Database(DB_PATH, { create: true });

    const currentVersion = db.query("SELECT version FROM db_version").get();
    if (currentVersion) {
      logger.debug(`Database version found: ${currentVersion.version}`);
    } else {
      logger.debug("No database version found");
    }

    db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userQuery TEXT NOT NULL,
      response TEXT DEFAULT NULL,
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

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversationId INTEGER NOT NULL,
      stepNumber INTEGER NOT NULL,
      content TEXT NOT NULL,
      timestamp BIGINT NOT NULL,
      duration INTEGER NOT NULL,
      role TEXT NOT NULL,
      FOREIGN KEY (conversationId) REFERENCES conversations (id)
    );

    CREATE TABLE IF NOT EXISTS tool_uses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversationId INTEGER NOT NULL,
      toolCallId TEXT NOT NULL,
      toolName TEXT NOT NULL,
      inputParams TEXT NOT NULL,
      output TEXT NOT NULL,
      timestamp BIGINT NOT NULL,
      duration INTEGER NOT NULL,
      FOREIGN KEY (conversationId) REFERENCES conversations (id)
    );
    `);

    const versionTableExists = db
      .query("SELECT name FROM sqlite_master WHERE type='table' AND name='db_version';")
      .get();

    if (!versionTableExists) {
      db.exec(`
        CREATE TABLE db_version (
          version INTEGER PRIMARY KEY
        );
      `);
      db.run("INSERT INTO db_version (version) VALUES (?);", [LATEST_DB_VERSION]);
      logger.debug(`Database version set to ${LATEST_DB_VERSION}`);
    }

    await migrateDatabase(db); // Automatically run migration if needed

    logger.debug(`Database initialized successfully at ${DB_PATH}`);
    return db;
  } catch (error) {
    logger.error(`Failed to initialize database: ${error}`);
    throw error;
  }
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
  toolCallId: string;
  toolName: string;
  inputParams: string;
  output: string;
  timestamp: number;
  duration: number;
}

export async function insertConversation(
  db: Database,
  userQuery: string,
  startTime: number,
): Promise<number> {
  logger.debug(`Inserting conversation: ${userQuery}`);

  const result = db.run("INSERT INTO conversations (userQuery, timestamp, response) VALUES (?, ?, ?)", [
    userQuery,
    startTime,
    null,
  ]);
  return Number(result.lastInsertRowid);
}

export async function insertMessage(
  db: Database,
  conversationId: number,
  stepNumber: number,
  content: string,
  duration: number,
  role: string,
): Promise<number> {
  logger.debug(
    `Inserting message: ${stepNumber} for conversation ${conversationId}, execution time: ${duration}ms`,
  );
  const timestamp = Date.now();
  const result = db.run(
    "INSERT INTO messages (conversationId, stepNumber, content, timestamp, duration, role) VALUES (?, ?, ?, ?, ?, ?)",
    [conversationId, stepNumber, content, timestamp, duration, role],
  );
  return Number(result.lastInsertRowid);
}

export interface ToolCallRecord {
  id: number;
  toolCallId: string;
  toolName: string;
  inputParams: string;
  output: string;
  timestamp: number;
  duration: number;
}

export interface InsertToolUseParams {
  db: Database;
  conversationId: number;
  toolCallId: string;
  toolName: string;
  inputParams: string;
  output: string;
  duration: number;
  timestamp: number;
}

export async function insertToolUse({
  db,
  conversationId,
  toolCallId,
  toolName,
  inputParams,
  output,
  duration,
  timestamp,
}: InsertToolUseParams): Promise<number> {
  const result = db.run(
    "INSERT INTO tool_uses (conversationId, toolCallId, toolName, inputParams, output, timestamp, duration) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [conversationId, toolCallId, toolName, inputParams, output, timestamp, duration],
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
  logger.debug(`Conversation ID: ${conversationId} updated successfully with new fields.`);
}

export function printDatabaseContents(db: Database) {
  const currentVersion = db.query("SELECT version FROM db_version").get() as { version: number } | undefined;

  if (currentVersion) {
    logger.debug(`Current database version: ${currentVersion.version}`);
  } else {
    logger.debug("No database version found");
  }

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
  conversationData: ConversationMetadata & { userQuery: string };
} {
  const conversationData = getConversation(db, conversationId);

  const steps = db
    .query("SELECT content, role, timestamp FROM messages WHERE conversationId = ? ORDER BY timestamp ASC")
    .all(conversationId) as Array<{ content: string; role: MessageRole; timestamp: number }>;

  const toolCalls = db
    .query(
      "SELECT toolName, toolCallId, inputParams, output, timestamp, duration FROM tool_uses WHERE conversationId = ? ORDER BY timestamp ASC",
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

async function migrateDatabase(db: Database): Promise<void> {
  const currentVersionRow = db.query("SELECT version FROM db_version").get();
  const currentVersion = currentVersionRow ? currentVersionRow.version : 0;

  if (currentVersion < LATEST_DB_VERSION) {
    db.transaction(() => {
      if (currentVersion === 6) {
        db.exec(`
          ALTER TABLE tool_uses RENAME TO old_tool_uses;

          CREATE TABLE tool_uses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversationId INTEGER NOT NULL,
            toolCallId TEXT NOT NULL,
            toolName TEXT NOT NULL,
            inputParams TEXT NOT NULL,
            output TEXT NOT NULL,
            timestamp BIGINT NOT NULL,
            duration INTEGER NOT NULL,
            FOREIGN KEY (conversationId) REFERENCES conversations (id)
          );

          INSERT INTO tool_uses
            (id, conversationId, toolCallId, toolName, inputParams, output, timestamp, duration)
          SELECT
            id, conversationId, CAST(stepId AS TEXT), toolName, inputParams, output, timestamp, duration
          FROM old_tool_uses;

          DROP TABLE old_tool_uses;
        `);
      } else if (currentVersion === 7) {
        // Apply fix for databases that are mistakenly stuck at version 7
        const columnExists = db
          .query(
            `
          SELECT 1 FROM pragma_table_info('tool_uses') WHERE name='toolCallId'
        `,
          )
          .get();

        if (!columnExists) {
          db.exec(`
            ALTER TABLE tool_uses RENAME TO old_tool_uses;

            CREATE TABLE tool_uses (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              conversationId INTEGER NOT NULL,
              toolCallId TEXT NOT NULL,
              toolName TEXT NOT NULL,
              inputParams TEXT NOT NULL,
              output TEXT NOT NULL,
              timestamp BIGINT NOT NULL,
              duration INTEGER NOT NULL,
              FOREIGN KEY (conversationId) REFERENCES conversations (id)
            );

            INSERT INTO tool_uses
              (id, conversationId, toolCallId, toolName, inputParams, output, timestamp, duration)
            SELECT
              id, conversationId, CAST(stepId AS TEXT), toolName, inputParams, output, timestamp, duration
            FROM old_tool_uses;

            DROP TABLE old_tool_uses;
          `);
        }
      }
      db.run("UPDATE db_version SET version = ?;", [LATEST_DB_VERSION]);
    })();

    logger.debug(`Database migrated to version ${LATEST_DB_VERSION}`);
  } else {
    logger.debug(`Database version is current: ${currentVersion}`);
  }
}

export { Database };
