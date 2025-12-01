import { defineConfig } from "drizzle-kit";
import path from "path";
import fs from "fs";

// Database path - can be configured via environment variable
const dbPath = process.env.SQLITE_DB_PATH || "./database/media-library.db";
const absoluteDbPath = path.isAbsolute(dbPath)
  ? dbPath
  : path.join(process.cwd(), dbPath);

// Ensure database directory exists
const dbDir = path.dirname(absoluteDbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: absoluteDbPath,
  },
  verbose: true,
  strict: true,
});
