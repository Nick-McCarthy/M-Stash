import { sqlite } from "./db-connection";

let schemaInitialized = false;

/**
 * Check if a column exists in a table
 */
function columnExists(tableName: string, columnName: string): boolean {
  const result = sqlite
    .prepare(
      `SELECT name FROM pragma_table_info(?) WHERE name = ?`
    )
    .get(tableName, columnName);
  return !!result;
}

/**
 * Add a column to a table if it doesn't exist
 */
function addColumnIfNotExists(
  tableName: string,
  columnName: string,
  columnDefinition: string
) {
  if (!columnExists(tableName, columnName)) {
    sqlite.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
    console.log(`  ✓ Added column ${columnName} to ${tableName}`);
  }
}

/**
 * Ensures the database schema is initialized by checking if tables exist.
 * If tables don't exist, this will attempt to create them.
 * This is useful for serverless environments where the database might not exist at runtime.
 */
export async function ensureSchema() {
  // Cache the initialization check to avoid repeated queries
  if (schemaInitialized) {
    return;
  }

  try {
    // Check if the users table exists (it's the first table in our schema)
    const result = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
      .get();

    // If the table doesn't exist, we need to push the schema
    // In a serverless environment, we can't use drizzle-kit push,
    // so we'll create the tables manually using SQL
    if (!result) {
      console.log("Database schema not found, initializing...");
      await initializeSchema();
    } else {
      // Tables exist, but check for missing columns (migrations)
      await checkAndAddMissingColumns();
    }

    schemaInitialized = true;
  } catch (error) {
    console.error("Error checking/initializing schema:", error);
    // Don't throw - let the calling code handle the error
    // The database connection might fail, but we shouldn't block everything
  }
}

/**
 * Check for missing columns and add them (for schema migrations)
 */
async function checkAndAddMissingColumns() {
  try {
    const tvShowsExists = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tv_shows'")
      .get();
    
    if (tvShowsExists) {
      addColumnIfNotExists("tv_shows", "genres", "TEXT NOT NULL DEFAULT '[]'");
    }
  } catch (migrationError) {
    console.warn("Warning: Could not check/add missing columns:", migrationError);
    // Continue anyway - the API will handle missing columns gracefully
  }
}

/**
 * Initialize the database schema by creating all tables
 */
async function initializeSchema() {
  // Since we can't use drizzle-kit push in runtime, we'll use SQL directly
  // This matches the schema defined in schema.ts
  
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (username);

    CREATE TABLE IF NOT EXISTS tag_types (
      tag_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      tag_name TEXT NOT NULL UNIQUE,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE UNIQUE INDEX IF NOT EXISTS tag_types_tag_name_unique ON tag_types (tag_name);

    CREATE TABLE IF NOT EXISTS genre_types (
      genre_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      genre_name TEXT NOT NULL UNIQUE,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE UNIQUE INDEX IF NOT EXISTS genre_types_genre_name_unique ON genre_types (genre_name);

    CREATE TABLE IF NOT EXISTS movies (
      movie_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      title TEXT NOT NULL,
      thumbnail_address TEXT,
      sprite_address TEXT,
      master_playlist_address TEXT,
      tags TEXT,
      genres TEXT,
      views INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tv_shows (
      tv_show_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      title TEXT NOT NULL,
      thumbnail_address TEXT,
      description TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      genres TEXT NOT NULL DEFAULT '[]',
      views INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tv_episodes (
      episode_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      tv_show_id INTEGER NOT NULL,
      season_number REAL NOT NULL,
      episode_number REAL NOT NULL,
      title TEXT,
      thumbnail_address TEXT,
      master_playlist_address TEXT,
      views INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (tv_show_id) REFERENCES tv_shows(tv_show_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comics (
      comic_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      comic_title TEXT NOT NULL,
      thumbnail_address TEXT,
      comic_description TEXT,
      tags TEXT,
      genres TEXT,
      views INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS comic_chapters (
      chapter_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      comic_id INTEGER NOT NULL,
      chapter_number REAL NOT NULL,
      image_count INTEGER NOT NULL DEFAULT 0,
      first_image_path TEXT,
      favorite INTEGER NOT NULL DEFAULT 0,
      views INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (comic_id) REFERENCES comics(comic_id) ON DELETE CASCADE,
      UNIQUE(comic_id, chapter_number)
    );

    CREATE TABLE IF NOT EXISTS chapter_images (
      image_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      chapter_id INTEGER NOT NULL,
      image_path TEXT NOT NULL,
      image_order INTEGER NOT NULL,
      FOREIGN KEY (chapter_id) REFERENCES comic_chapters(chapter_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ebooks (
      ebook_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      title TEXT NOT NULL,
      author TEXT,
      thumbnail_address TEXT,
      file_path TEXT NOT NULL,
      tags TEXT,
      genres TEXT,
      views INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ebook_bookmarks (
      bookmark_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      ebook_id INTEGER NOT NULL,
      bookmark_name TEXT NOT NULL,
      cfi TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (ebook_id) REFERENCES ebooks(ebook_id) ON DELETE CASCADE
    );

    PRAGMA foreign_keys = ON;
  `);

  // Also check for missing columns after creating tables
  await checkAndAddMissingColumns();

  console.log("✅ Database schema initialized");
}

