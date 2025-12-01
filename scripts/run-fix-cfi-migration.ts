import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Database path
const dbPath = process.env.SQLITE_DB_PATH || "./database/media-library.db";
const absoluteDbPath = path.isAbsolute(dbPath)
  ? dbPath
  : path.join(process.cwd(), dbPath);

async function runMigration() {
  const db = new Database(absoluteDbPath);
  
  try {
    console.log("Starting migration: Adding CFI column to ebook_bookmarks...");
    console.log(`Database path: ${absoluteDbPath}`);

    // Read the SQL migration file
    const sqlPath = path.join(process.cwd(), "scripts", "fix-cfi-migration.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf-8");

    // Enable foreign keys
    db.pragma("foreign_keys = ON");

    // Split by semicolons and execute each statement
    const statements = sqlContent
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    db.transaction(() => {
      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`Executing: ${statement.substring(0, 60)}...`);
          try {
            db.exec(statement + ";");
          } catch (error: any) {
            // Ignore "already exists" errors for IF NOT EXISTS
            if (error.message?.includes("already exists")) {
              console.log(`  (skipped - already exists)`);
            } else {
              throw error;
            }
          }
        }
      }
    })();

    console.log("✅ Migration completed successfully!");
    db.close();
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Migration failed:", error.message);
    console.error(error);
    db.close();
    process.exit(1);
  }
}

runMigration();

