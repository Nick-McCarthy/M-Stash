# Drizzle ORM Setup and Usage Guide

This document explains how Drizzle ORM is set up and used in this project. Drizzle is a TypeScript ORM that provides type-safe database queries with excellent developer experience.

## Table of Contents

1. [What is Drizzle ORM?](#what-is-drizzle-orm)
2. [Installation](#installation)
3. [Project Structure](#project-structure)
4. [Configuration](#configuration)
5. [Database Connection](#database-connection)
6. [Schema Definition](#schema-definition)
7. [Usage Examples](#usage-examples)
8. [Migrations](#migrations)
9. [Development Workflow](#development-workflow)
10. [Vercel/Serverless Considerations](#vercelserverless-considerations)

---

## What is Drizzle ORM?

Drizzle ORM is a lightweight, performant TypeScript ORM that:
- Provides **type-safe** database queries
- Has a **SQL-like** query API (easy to learn)
- Supports **migrations** via Drizzle Kit
- Works with multiple databases (this project uses SQLite)
- Generates TypeScript types from your schema automatically

---

## Installation

Drizzle is already installed in this project. The required packages are:

```json
{
  "dependencies": {
    "drizzle-orm": "^0.44.6",
    "better-sqlite3": "^12.5.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.31.5",
    "@types/better-sqlite3": "^7.6.13"
  }
}
```

**Key packages:**
- `drizzle-orm`: The core ORM library
- `drizzle-kit`: CLI tool for migrations and schema management
- `better-sqlite3`: SQLite driver (synchronous, fast)

---

## Project Structure

```
project-root/
├── drizzle.config.ts          # Drizzle Kit configuration
├── drizzle/                    # Generated migration files
│   └── meta/
│   └── *.sql
├── src/lib/db/
│   ├── index.ts               # Re-exports (main entry point)
│   ├── db-connection.ts       # Database connection setup
│   ├── schema.ts              # Table definitions
│   ├── ensure-schema.ts       # Runtime schema initialization
│   └── sqlite-helpers.ts      # SQL helper utilities
└── database/
    └── media-library.db       # SQLite database file
```

---

## Configuration

### Drizzle Kit Configuration (`drizzle.config.ts`)

```typescript
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
  schema: "./src/lib/db/schema.ts",  // Path to schema file
  out: "./drizzle",                   // Output directory for migrations
  dialect: "sqlite",                  // Database type
  dbCredentials: {
    url: absoluteDbPath,              // Database file path
  },
  verbose: true,                      // Detailed logging
  strict: true,                       // Strict mode for type safety
});
```

**Key settings:**
- `schema`: Points to your schema definition file
- `out`: Where migration files are generated
- `dialect`: Database type (`sqlite`, `postgresql`, `mysql`, etc.)
- `dbCredentials.url`: SQLite database file path

---

## Database Connection

### Connection Setup (`src/lib/db/db-connection.ts`)

The database connection is set up with special handling for different environments:

```typescript
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

// Environment-specific database path
const isVercel = process.env.VERCEL === "1";
const defaultDbPath = isVercel 
  ? "/tmp/media-library.db"  // Vercel uses /tmp (writable)
  : "./database/media-library.db";
const dbPath = process.env.SQLITE_DB_PATH || defaultDbPath;

// Create SQLite connection
const sqlite = new Database(dbPath);

// Enable foreign keys (important for SQLite)
sqlite.pragma("foreign_keys = ON");

// Enable WAL mode for better concurrency (not on Vercel)
if (!isVercel) {
  sqlite.pragma("journal_mode = WAL");
}

// Create Drizzle instance with schema
export const db = drizzle(sqlite, { schema });
```

**Key points:**
- Uses `better-sqlite3` for synchronous SQLite access
- Handles Vercel/serverless environments differently
- Enables foreign key constraints
- WAL mode improves concurrency (disabled on Vercel)

**Import the database instance:**
```typescript
import { db } from "@/lib/db";
```

---

## Schema Definition

### Table Definitions (`src/lib/db/schema.ts`)

Tables are defined using Drizzle's schema API:

```typescript
import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  index,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// Example: Users table
export const users = sqliteTable("users", {
  userId: integer("user_id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Example: Ebooks table with index
export const ebooks = sqliteTable(
  "ebooks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ebookTitle: text("ebook_title").notNull(),
    ebookAuthor: text("ebook_author").notNull(),
    ebookAddress: text("ebook_address").notNull(),
  },
  (table) => ({
    // Composite index
    uniqueTitleAuthor: index("idx_ebooks_title_author").on(
      table.ebookTitle,
      table.ebookAuthor
    ),
  })
);

// Example: Table with foreign key
export const ebookBookmarks = sqliteTable(
  "ebook_bookmarks",
  {
    bookmarkId: integer("bookmark_id").primaryKey({ autoIncrement: true }),
    ebookId: integer("ebook_id")
      .notNull()
      .references(() => ebooks.id, { onDelete: "cascade" }),
    bookmarkName: text("bookmark_name").notNull(),
    cfi: text("cfi"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    ebookIdIdx: index("idx_ebook_bookmarks_ebook_id").on(table.ebookId),
  })
);
```

### Column Types

- `integer()`: Integer numbers
- `text()`: Text strings
- `real()`: Floating-point numbers
- `blob()`: Binary data

### Column Options

- `.primaryKey()`: Primary key
- `.notNull()`: Required field
- `.unique()`: Unique constraint
- `.default(value)`: Default value
- `.$defaultFn(() => value)`: Default function (e.g., `new Date()`)
- `.references(() => table.column)`: Foreign key
- `{ mode: "timestamp" }`: Store as timestamp (auto-converts Date)

### Relations

Define relationships between tables:

```typescript
import { relations } from "drizzle-orm";

// One-to-many: Ebook has many Bookmarks
export const ebooksRelations = relations(ebooks, ({ many }) => ({
  bookmarks: many(ebookBookmarks),
}));

// Many-to-one: Bookmark belongs to Ebook
export const ebookBookmarksRelations = relations(ebookBookmarks, ({ one }) => ({
  ebook: one(ebooks, {
    fields: [ebookBookmarks.ebookId],
    references: [ebooks.id],
  }),
}));
```

### Type Inference

Drizzle automatically generates TypeScript types:

```typescript
// Infer types from schema
export type Ebook = typeof ebooks.$inferSelect;  // For SELECT queries
export type NewEbook = typeof ebooks.$inferInsert; // For INSERT queries
```

---

## Usage Examples

### Basic Queries

#### SELECT (Find One)

```typescript
import { db } from "@/lib/db";
import { ebooks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Find ebook by ID
const ebook = await db
  .select()
  .from(ebooks)
  .where(eq(ebooks.id, ebookId))
  .limit(1);

if (ebook.length === 0) {
  // Not found
}
const ebookData = ebook[0];
```

#### SELECT (Find Many)

```typescript
// Get all bookmarks for an ebook, ordered by creation date
import { asc } from "drizzle-orm";

const bookmarks = await db
  .select()
  .from(ebookBookmarks)
  .where(eq(ebookBookmarks.ebookId, ebookId))
  .orderBy(asc(ebookBookmarks.createdAt));
```

#### INSERT

```typescript
// Insert a new ebook
const newEbook = await db.insert(ebooks).values({
  ebookTitle: "The Great Gatsby",
  ebookAuthor: "F. Scott Fitzgerald",
  ebookAddress: "s3://bucket/ebook.epub",
}).returning(); // Returns the inserted row

const insertedEbook = newEbook[0];
```

#### UPDATE

```typescript
// Update an ebook
await db
  .update(ebooks)
  .set({ ebookTitle: "New Title" })
  .where(eq(ebooks.id, ebookId));
```

#### DELETE

```typescript
// Delete a bookmark
await db
  .delete(ebookBookmarks)
  .where(eq(ebookBookmarks.bookmarkId, bookmarkId));
```

### Query Operators

```typescript
import { eq, and, or, like, ilike, desc, asc, sql, inArray } from "drizzle-orm";

// Equality
eq(ebooks.id, 1)

// AND condition
and(eq(ebooks.id, 1), eq(ebooks.ebookAuthor, "Author"))

// OR condition
or(eq(ebooks.id, 1), eq(ebooks.id, 2))

// LIKE (case-sensitive)
like(ebooks.ebookTitle, "%Gatsby%")

// ILIKE (case-insensitive)
ilike(ebooks.ebookTitle, "%gatsby%")

// IN array
inArray(ebooks.id, [1, 2, 3])

// Order by
orderBy(asc(ebooks.ebookTitle))  // Ascending
orderBy(desc(ebooks.createdAt)) // Descending

// Raw SQL
sql`LOWER(${ebooks.ebookTitle}) LIKE ${'%gatsby%'}`
```

### Complex Queries

#### Joins (using relations)

```typescript
// Get ebook with all bookmarks (using relations)
import { db } from "@/lib/db";
import { ebooks, ebookBookmarks } from "@/lib/db/schema";

const result = await db.query.ebooks.findFirst({
  where: eq(ebooks.id, ebookId),
  with: {
    bookmarks: true, // Include related bookmarks
  },
});
```

#### Aggregations

```typescript
import { sql, count } from "drizzle-orm";

// Count bookmarks per ebook
const bookmarkCounts = await db
  .select({
    ebookId: ebookBookmarks.ebookId,
    count: sql<number>`count(*)`.as("count"),
  })
  .from(ebookBookmarks)
  .groupBy(ebookBookmarks.ebookId);
```

### Real-World Example

From `src/app/api/ebook-library/[ebook]/route.ts`:

```typescript
import { db } from "@/lib/db";
import { ebooks, ebookBookmarks } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(request: NextRequest, { params }) {
  const { ebook } = await params;
  const ebookId = parseInt(ebook);

  // Get ebook details
  const ebookResult = await db
    .select()
    .from(ebooks)
    .where(eq(ebooks.id, ebookId))
    .limit(1);

  if (ebookResult.length === 0) {
    return NextResponse.json({ error: "Ebook not found" }, { status: 404 });
  }

  const ebookData = ebookResult[0];

  // Get all bookmarks for this ebook
  const bookmarksResult = await db
    .select()
    .from(ebookBookmarks)
    .where(eq(ebookBookmarks.ebookId, ebookId))
    .orderBy(asc(ebookBookmarks.createdAt));

  return NextResponse.json({
    id: ebookData.id,
    title: ebookData.ebookTitle,
    author: ebookData.ebookAuthor,
    address: ebookData.ebookAddress,
    bookmarks: bookmarksResult.map((b) => ({
      bookmark_id: b.bookmarkId,
      bookmark_name: b.bookmarkName,
      // ... map other fields
    })),
  });
}
```

---

## Migrations

### Generate Migration

When you modify the schema, generate a migration:

```bash
npm run db:generate
```

This:
1. Compares your schema to the current database state
2. Generates SQL migration files in `./drizzle/`
3. Creates a migration metadata file

### Apply Migration

```bash
npm run db:migrate
```

This applies pending migrations to the database.

### Push Schema (Development)

For development, you can push schema changes directly (without migrations):

```bash
npm run db:push
```

**⚠️ Warning:** `db:push` directly modifies the database. Use migrations in production.

### Migration Workflow

1. **Modify schema** (`src/lib/db/schema.ts`)
2. **Generate migration**: `npm run db:generate`
3. **Review migration files** in `./drizzle/`
4. **Apply migration**: `npm run db:migrate`

---

## Development Workflow

### Available Scripts

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",      // Generate migrations
    "db:migrate": "drizzle-kit migrate",        // Apply migrations
    "db:push": "drizzle-kit push",             // Push schema directly
    "db:studio": "drizzle-kit studio",         // Open Drizzle Studio (GUI)
    "db:seed:tags-genres": "tsx scripts/seed-tags-genres.ts",
    "db:seed:all": "tsx scripts/seed-all.ts"
  }
}
```

### Drizzle Studio

Visual database browser:

```bash
npm run db:studio
```

Opens a web interface to browse tables, run queries, and edit data.

### Typical Development Flow

1. **Start development server**: `npm run dev`
2. **Make schema changes**: Edit `src/lib/db/schema.ts`
3. **Generate migration**: `npm run db:generate`
4. **Apply migration**: `npm run db:migrate`
5. **Test queries**: Use in API routes
6. **View data**: `npm run db:studio`

---

## Vercel/Serverless Considerations

### Database Location

On Vercel (serverless), the database is stored in `/tmp`:

```typescript
const isVercel = process.env.VERCEL === "1";
const dbPath = isVercel 
  ? "/tmp/media-library.db"  // Writable on Vercel
  : "./database/media-library.db";
```

**Important:** `/tmp` is ephemeral and cleared between function invocations. The code attempts to copy a seeded database from build output to `/tmp` on first invocation.

### Schema Initialization

The `ensure-schema.ts` file handles runtime schema initialization:

```typescript
import { ensureSchema } from "@/lib/db/ensure-schema";

// Call before using database in serverless environments
await ensureSchema();
```

This:
- Checks if tables exist
- Creates tables if missing
- Adds missing columns (for migrations)
- Works in serverless environments where migrations can't run at build time

### Build-Time Seeding

For Vercel deployments:
1. Database is seeded during build
2. Seeded database is copied to `/tmp` on first request
3. If copy fails, schema is initialized and seeded at runtime

---

## Best Practices

### 1. Always Use Type-Safe Queries

```typescript
// ✅ Good: Type-safe
const ebook = await db.select().from(ebooks).where(eq(ebooks.id, id));

// ❌ Bad: Raw SQL (loses type safety)
const ebook = await db.execute(sql`SELECT * FROM ebooks WHERE id = ${id}`);
```

### 2. Use Transactions for Multiple Operations

```typescript
await db.transaction(async (tx) => {
  await tx.insert(ebooks).values({ ... });
  await tx.insert(ebookBookmarks).values({ ... });
});
```

### 3. Handle Errors Gracefully

```typescript
try {
  const result = await db.select().from(ebooks).where(eq(ebooks.id, id));
  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
} catch (error) {
  console.error("Database error:", error);
  return NextResponse.json({ error: "Database error" }, { status: 500 });
}
```

### 4. Use Indexes for Performance

```typescript
// Define indexes in schema
export const ebooks = sqliteTable(
  "ebooks",
  { /* columns */ },
  (table) => ({
    titleIdx: index("idx_ebooks_title").on(table.ebookTitle),
  })
);
```

### 5. Export Types from Schema

```typescript
// Export types for use throughout the app
export type Ebook = typeof ebooks.$inferSelect;
export type NewEbook = typeof ebooks.$inferInsert;
```

---

## Troubleshooting

### Database Locked Error

**Problem:** SQLite database is locked (usually from multiple connections)

**Solution:**
- Ensure only one connection instance exists
- Use WAL mode (already enabled in this project)
- Close connections properly

### Migration Issues

**Problem:** Migrations fail to apply

**Solution:**
1. Check migration files in `./drizzle/`
2. Verify database file exists and is writable
3. Try `db:push` for development (resets schema)

### Type Errors

**Problem:** TypeScript errors with Drizzle types

**Solution:**
1. Ensure schema is properly exported
2. Import types from schema: `import type { Ebook } from "@/lib/db/schema"`
3. Use `$inferSelect` and `$inferInsert` for type inference

### Vercel Deployment Issues

**Problem:** Database not found on Vercel

**Solution:**
1. Ensure database is seeded during build
2. Check that `ensureSchema()` is called
3. Verify `/tmp` directory is writable
4. Check build logs for database copy messages

---

## Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Drizzle Kit Documentation](https://orm.drizzle.team/kit-docs/overview)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [better-sqlite3 Documentation](https://github.com/WiseLibs/better-sqlite3)

---

## Summary

This project uses Drizzle ORM with SQLite for type-safe database operations. Key points:

1. **Schema-first approach**: Define tables in `schema.ts`
2. **Type-safe queries**: All queries are typed automatically
3. **Migrations**: Use `db:generate` and `db:migrate` for schema changes
4. **Serverless support**: Handles Vercel/serverless environments
5. **Relations**: Define relationships between tables
6. **Indexes**: Optimize queries with proper indexes

The database connection is centralized in `src/lib/db/db-connection.ts`, and all API routes import `db` from `@/lib/db` to perform queries.

