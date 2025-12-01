import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function runMigration() {
  try {
    console.log("Starting migration: Adding CFI column to ebook_bookmarks...");

    // Read the SQL migration file
    const sqlPath = path.join(process.cwd(), "scripts", "add-cfi-column-to-bookmarks.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf-8");

    // Split by semicolons and execute each statement
    const statements = sqlContent
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        await db.execute(sql.raw(statement));
      }
    }

    console.log("✅ Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();

