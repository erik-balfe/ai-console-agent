import fs from "fs";
import { Document } from "llamaindex";
import path from "path";
import sqlite3 from "sqlite3";

export type Database = sqlite3.Database;

const DB_PATH = path.join(
  process.env.HOME || process.env.USERPROFILE || "",
  ".ai-console-agent",
  "chat_history.db",
);

export async function initializeDatabase(): Promise<sqlite3.Database> {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, async (err) => {
      if (err) {
        reject(err);
        return;
      }

      try {
        await runQuery(
          db,
          `
          CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_query TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            user_feedback TEXT
          )
        `,
        );

        await runQuery(
          db,
          `
          CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            is_user BOOLEAN NOT NULL,
            FOREIGN KEY (conversation_id) REFERENCES conversations (id)
          )
        `,
        );

        await runQuery(
          db,
          `
          CREATE TABLE IF NOT EXISTS embeddings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id INTEGER NOT NULL,
            embedding_vector TEXT NOT NULL,
            FOREIGN KEY (message_id) REFERENCES messages (id)
          )
        `,
        );

        resolve(db);
      } catch (error) {
        reject(error);
      }
    });
  });
}

function runQuery(db: sqlite3.Database, query: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(query, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export interface Conversation {
  id: number;
  user_query: string;
  timestamp: number;
  user_feedback?: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  content: string;
  timestamp: number;
  is_user: boolean;
}

export async function insertConversation(db: sqlite3.Database, userQuery: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    db.run(
      "INSERT INTO conversations (user_query, timestamp) VALUES (?, ?)",
      [userQuery, timestamp],
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      },
    );
  });
}

export async function insertMessage(
  db: sqlite3.Database,
  conversationId: number,
  content: string,
  isUser: boolean,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    db.run(
      "INSERT INTO messages (conversation_id, content, timestamp, is_user) VALUES (?, ?, ?, ?)",
      [conversationId, content, timestamp, isUser ? 1 : 0],
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      },
    );
  });
}

export async function getConversation(db: sqlite3.Database, conversationId: number): Promise<Conversation> {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM conversations WHERE id = ?", [conversationId], (err, row) => {
      if (err) {
        reject(err);
      } else if (row) {
        resolve(row as Conversation);
      } else {
        reject(new Error("Conversation not found"));
      }
    });
  });
}

export async function getAllConversations(db: sqlite3.Database): Promise<Conversation[]> {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM conversations ORDER BY timestamp DESC", (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows as Conversation[]);
      }
    });
  });
}

export async function updateUserFeedback(
  db: sqlite3.Database,
  conversationId: number,
  feedback: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run("UPDATE conversations SET user_feedback = ? WHERE id = ?", [feedback, conversationId], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export async function createDocumentFromConversation(
  db: sqlite3.Database,
  conversationId: number,
): Promise<Document> {
  return new Promise((resolve, reject) => {
    db.all<{ is_user: number; content: string }>(
      "SELECT content, is_user FROM messages WHERE conversation_id = ? ORDER BY timestamp",
      [conversationId],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const text = rows.map((row) => `${row.is_user ? "User" : "AI"}: ${row.content}`).join("\n");
          resolve(new Document({ text, id_: conversationId.toString() }));
        }
      },
    );
  });
}
