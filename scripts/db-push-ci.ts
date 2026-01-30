import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import path from "path";

// Ensure database directory exists
const dbPath = process.env.SQLITE_DB_PATH || "./database/media-library.db";
const dbDir = path.dirname(dbPath);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

try {
  // Run drizzle-kit push and auto-confirm any prompts
  // Pipe "y" to auto-confirm the prompt in CI environments
  // Vercel uses Linux, so we use Unix-style piping
  execSync('echo "y" | npx drizzle-kit push', {
    stdio: "inherit",
    shell: "/bin/sh",
    env: {
      ...process.env,
      CI: "true",
    },
  });
  console.log("✅ Database schema pushed successfully");
} catch (error) {
  console.error("❌ Failed to push database schema:", error);
  process.exit(1);
}
