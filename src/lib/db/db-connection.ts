import { drizzle } from "drizzle-orm/better-sqlite3";
import Database, { type Database as DatabaseType } from "better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

// Database path - can be configured via environment variable
// On Vercel (serverless), use /tmp which is writable and persists for the function invocation
// In other environments, use the configured path or default to ./database/media-library.db
const isVercel = process.env.VERCEL === "1";
const defaultDbPath = isVercel 
  ? "/tmp/media-library.db" 
  : "./database/media-library.db";
const dbPath = process.env.SQLITE_DB_PATH || defaultDbPath;

// On Vercel, try to copy the database from build output to /tmp if it exists
// This allows us to use the seeded database from build time (including demo user)
if (isVercel && !fs.existsSync(dbPath)) {
  // Try multiple possible locations for the build database
  const possiblePaths = [
    path.join(process.cwd(), "database", "media-library.db"),
    path.join(process.cwd(), ".next", "database", "media-library.db"),
    path.join("/var/task", "database", "media-library.db"), // Vercel build output location
  ];
  
  let copied = false;
  for (const buildDbPath of possiblePaths) {
    if (fs.existsSync(buildDbPath)) {
      try {
        fs.copyFileSync(buildDbPath, dbPath);
        console.log(`✓ Copied seeded database from ${buildDbPath} to ${dbPath}`);
        copied = true;
        break;
      } catch (copyError) {
        console.warn(`Could not copy from ${buildDbPath}:`, copyError);
      }
    }
  }
  
  if (!copied) {
    console.log("⚠️  No seeded database found in build output, will create fresh database");
    console.log("   (Demo user will be created via seed script on first API call)");
  }
}

// Ensure database directory exists (only needed for non-Vercel paths)
if (!isVercel) {
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

// Create SQLite database connection
let sqlite: DatabaseType;
try {
  sqlite = new Database(dbPath);

  // Enable foreign keys (important for SQLite)
  sqlite.pragma("foreign_keys = ON");
  // Enable WAL mode for better concurrency (but not on Vercel as it can cause issues)
  if (!isVercel) {
    sqlite.pragma("journal_mode = WAL");
  }

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

