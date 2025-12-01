# Drizzle ORM SQLite Support Guide

Yes! **Drizzle ORM fully supports SQLite**. This guide shows you how to use SQLite alongside or instead of PostgreSQL.

## 📦 Required Package

First, install the SQLite driver:

```bash
npm install better-sqlite3
npm install -D @types/better-sqlite3
```

**Note:** If you're already using Drizzle with PostgreSQL, you can use both databases simultaneously by importing from different files.

## 🔄 Key Differences Between PostgreSQL and SQLite Schemas

### 1. **Imports**

```typescript
// PostgreSQL
import { pgTable, serial, pgEnum } from "drizzle-orm/pg-core";

// SQLite
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
```

### 2. **Auto-increment IDs**

```typescript
// PostgreSQL
comicId: serial("comic_id").primaryKey();

// SQLite
comicId: integer("comic_id").primaryKey({ autoIncrement: true });
```

### 3. **Enums**

```typescript
// PostgreSQL - uses pgEnum
export const comicTypeEnum = pgEnum("comic_type", [
  "manga",
  "webtoon",
  "western",
]);
comicType: comicTypeEnum("comic_type").notNull();

// SQLite - uses text with type narrowing
comicType: text("comic_type")
  .notNull()
  .$type<"manga" | "webtoon" | "western">();
```

### 4. **Arrays**

```typescript
// PostgreSQL - native array support
tags: varchar("tags", { length: 50 }).array().default([]).notNull();

// SQLite - stored as JSON text
tags: text("tags").default("[]").notNull(); // JSON array stored as TEXT
```

### 5. **Booleans**

```typescript
// PostgreSQL
isActive: boolean("is_active").default(true).notNull();

// SQLite - must use integer with mode
isActive: integer("is_active", { mode: "boolean" }).default(true).notNull();
```

### 6. **Timestamps**

```typescript
// PostgreSQL
updatedAt: timestamp("updated_at", { withTimezone: true })
  .defaultNow()
  .notNull();

// SQLite - stored as integer (Unix timestamp)
updatedAt: integer("updated_at", { mode: "timestamp" }).notNull();
```

### 7. **Decimals**

```typescript
// PostgreSQL
chapterNumber: decimal("chapter_number", { precision: 10, scale: 2 }).notNull();

// SQLite - use REAL
chapterNumber: real("chapter_number").notNull();
```

### 8. **Indexes with Operators**

```typescript
// PostgreSQL - GIN indexes for arrays
tagsGinIdx: index("idx_comics_tags_gin").using("gin", table.tags);

// SQLite - not available, regular indexes only
// Array searching must use JSON functions in queries
```

## 📁 File Structure

You now have two parallel schema files:

```
src/lib/db/
├── schema.ts          # PostgreSQL schema (existing)
├── schema-sqlite.ts   # SQLite schema (new)
└── DRIZZLE_SQLITE_GUIDE.md  # This file

src/lib/
├── db.ts              # PostgreSQL connection (existing)
└── db-sqlite.ts       # SQLite connection (new)

drizzle.config.ts      # PostgreSQL config (existing)
drizzle.config.sqlite.ts  # SQLite config (new)
```

## 🔧 Database Connection

### PostgreSQL (existing)

```typescript
// src/lib/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./db/schema";

const pool = new Pool({
  /* config */
});
export const db = drizzle(pool, { schema });
```

### SQLite (new)

```typescript
// src/lib/db-sqlite.ts
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./db/schema-sqlite";

const sqlite = new Database("./database/media-library.db");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });
```

## 🔀 Switching Between Databases

### Option 1: Environment Variable

Create a wrapper that switches based on env:

```typescript
// src/lib/db.ts
import { drizzle as pgDrizzle } from "drizzle-orm/node-postgres";
import { drizzle as sqliteDrizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";

const useSqlite = process.env.DB_TYPE === "sqlite";

export const db = useSqlite
  ? sqliteDrizzle(
      new Database(process.env.SQLITE_DB_PATH || "./database/media-library.db"),
      { schema: await import("./db/schema-sqlite") }
    )
  : pgDrizzle(pool, { schema: await import("./db/schema") });
```

### Option 2: Separate Files (Recommended)

Keep them separate and import as needed:

```typescript
// Use PostgreSQL
import { db } from "@/lib/db";

// Use SQLite
import { db } from "@/lib/db-sqlite";
```

## 🛠️ Drizzle Kit Commands

### PostgreSQL

```bash
# Generate migrations
npm run db:generate

# Push schema
npm run db:push

# Open Studio
npm run db:studio
```

### SQLite

```bash
# Generate migrations
drizzle-kit generate --config=drizzle.config.sqlite.ts

# Push schema
drizzle-kit push --config=drizzle.config.sqlite.ts

# Open Studio
drizzle-kit studio --config=drizzle.config.sqlite.ts
```

Or add scripts to `package.json`:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:generate:sqlite": "drizzle-kit generate --config=drizzle.config.sqlite.ts",
    "db:push": "drizzle-kit push",
    "db:push:sqlite": "drizzle-kit push --config=drizzle.config.sqlite.ts",
    "db:studio": "drizzle-kit studio",
    "db:studio:sqlite": "drizzle-kit studio --config=drizzle.config.sqlite.ts"
  }
}
```

## 📝 Query Differences

### Array Operations

**PostgreSQL:**

```typescript
import { arrayContains } from "drizzle-orm";

// Native array contains
const result = await db
  .select()
  .from(comics)
  .where(arrayContains(comics.tags, ["Action"]));
```

**SQLite (JSON):**

```typescript
import { sql } from "drizzle-orm";

// JSON array contains (stored as text)
const result = await db
  .select()
  .from(comics)
  .where(sql`json_extract(${comics.tags}, '$') LIKE '%"Action"%'`);
```

### Helper Functions

Create helper functions for JSON array operations:

```typescript
// src/lib/db/sqlite-helpers.ts
import { SQL, sql } from "drizzle-orm";

export function jsonArrayContains(column: any, value: string): SQL {
  return sql`json_extract(${column}, '$') LIKE ${`%"${value}"%`}`;
}

export function jsonArrayAppend(column: any, value: string): SQL {
  return sql`json_array_append(${column}, '$', ${value})`;
}

// Usage
const result = await db
  .select()
  .from(comics)
  .where(jsonArrayContains(comics.tags, "Action"));
```

## ⚠️ Limitations & Considerations

1. **Arrays**: Must use JSON functions instead of native array operators
2. **GIN Indexes**: Not available - use regular indexes and application-level filtering
3. **Concurrent Writes**: WAL mode helps but still not as robust as PostgreSQL
4. **Full-Text Search**: Use SQLite FTS5 extension or application-level search
5. **CHECK Constraints**: Cannot use subqueries in CHECK constraints
6. **Functions**: Stored functions not supported - use application code

## 🎯 Best Practices

1. **Use Type Narrowing**: Use `.$type<>()` for enum-like columns to maintain type safety
2. **JSON Functions**: Create helper functions for common JSON array operations
3. **WAL Mode**: Always enable WAL mode for better concurrency
4. **Foreign Keys**: Always enable foreign key constraints (`PRAGMA foreign_keys = ON`)
5. **Migration Strategy**: Keep separate migration folders for each database type

## 📚 Resources

- [Drizzle SQLite Docs](https://orm.drizzle.team/docs/get-started-sqlite)
- [Better-SQLite3 Docs](https://github.com/WiseLibs/better-sqlite3)
- [SQLite JSON Functions](https://www.sqlite.org/json1.html)
