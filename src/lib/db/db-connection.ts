import { drizzle } from "drizzle-orm/better-sqlite3";
import Database, { type Database as DatabaseType } from "better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

// Database path - can be configured via environment variable
const dbPath = process.env.SQLITE_DB_PATH || "./database/media-library.db";

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create SQLite database connection
let sqlite: DatabaseType;
try {
  sqlite = new Database(dbPath);

  // Enable foreign keys (important for SQLite)
  sqlite.pragma("foreign_keys = ON");
  // Enable WAL mode for better concurrency
  sqlite.pragma("journal_mode = WAL");

  console.log(`Connected to SQLite database at ${dbPath}`);
} catch (err) {
  console.error("SQLite database error:", err);
  throw err;
}

// Export sqlite instance for schema initialization
export { sqlite };

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

// Helper function to execute raw queries (for migrations, etc.)
export function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    if (params && params.length > 0) {
      const stmt = sqlite.prepare(text);
      const result = stmt.all(...params);
      const duration = Date.now() - start;
      console.log("Executed query", {
        text,
        duration,
        rows: Array.isArray(result) ? result.length : 0,
      });
      return {
        rows: result,
        rowCount: Array.isArray(result) ? result.length : 0,
      };
    } else {
      const result = sqlite.prepare(text).all();
      const duration = Date.now() - start;
      console.log("Executed query", {
        text,
        duration,
        rows: Array.isArray(result) ? result.length : 0,
      });
      return {
        rows: result,
        rowCount: Array.isArray(result) ? result.length : 0,
      };
    }
  } catch (error) {
    console.error("Query error:", error);
    throw error;
  }
}

// Close database connection (useful for testing or graceful shutdown)
export function closeDb() {
  sqlite.close();
}

export default db;

