# Drizzle ORM Migration Guide

This project has been migrated from raw SQL queries to Drizzle ORM for better type safety and developer experience.

## 🚀 **What's New**

### **Drizzle ORM Benefits:**

- ✅ **Type Safety** - Full TypeScript support with inferred types
- ✅ **Query Builder** - Intuitive API for complex queries
- ✅ **Migrations** - Version-controlled database schema changes
- ✅ **Relations** - Easy joins and relationship management
- ✅ **Performance** - Optimized queries with proper indexing

## 📁 **New File Structure**

```
src/lib/db/
├── schema.ts          # Drizzle schema definitions
└── migrations/        # Generated migration files

drizzle.config.ts      # Drizzle configuration
scripts/
└── seed.ts           # Database seeding script
```

## 🛠 **Setup Commands**

### **1. Generate Migration Files**

```bash
npm run db:generate
```

### **2. Push Schema to Database**

```bash
npm run db:push
```

### **3. Seed Initial Data**

```bash
npm run db:seed
```

### **4. Open Drizzle Studio (Database GUI)**

```bash
npm run db:studio
```

## 📊 **Schema Overview**

### **Tables with Tags Support:**

- `comics` - Comic books with tags array
- `movies` - Movies with tags array
- `tv_shows` - TV shows with tags array
- `tag_types` - Valid tag definitions

### **Relations:**

- Comics → Chapters → Images
- TV Shows → Episodes
- Ebooks → Bookmarks

## 🔧 **Usage Examples**

### **Basic Queries**

```typescript
import { db } from "@/lib/db";
import { comics, eq, desc } from "@/lib/db/schema";

// Get all comics
const allComics = await db.select().from(comics);

// Get comic by ID
const comic = await db.select().from(comics).where(eq(comics.comicId, 1));

// Get comics with tags
const actionComics = await db
  .select()
  .from(comics)
  .where(arrayContains(comics.tags, ["Action"]));
```

### **Complex Queries**

```typescript
// Get comics with recent chapters
const comicsWithChapters = await db
  .select({
    comic: comics,
    chapters: comicChapters,
  })
  .from(comics)
  .leftJoin(comicChapters, eq(comics.comicId, comicChapters.comicId))
  .where(eq(comics.status, "ongoing"))
  .orderBy(desc(comics.updatedAt));
```

### **Insert Operations**

```typescript
// Insert new comic
const newComic = await db
  .insert(comics)
  .values({
    comicTitle: "My New Comic",
    thumbnailAddress: "/path/to/thumb.jpg",
    comicType: "manga",
    tags: ["Action", "Adventure"],
    status: "ongoing",
  })
  .returning();
```

### **Update Operations**

```typescript
// Update comic tags
await db
  .update(comics)
  .set({ tags: ["Action", "Sci-Fi", "Popular"] })
  .where(eq(comics.comicId, 1));
```

## 🔄 **Migration from Raw SQL**

### **Before (Raw SQL):**

```typescript
const result = await query(
  "SELECT * FROM comics WHERE comic_type = $1 AND $2 = ANY(tags)",
  ["manga", "Action"]
);
```

### **After (Drizzle):**

```typescript
const result = await db
  .select()
  .from(comics)
  .where(
    and(eq(comics.comicType, "manga"), arrayContains(comics.tags, ["Action"]))
  );
```

## 🏷 **Tag Management**

### **Add Tags to Comic:**

```typescript
// Using utility function
await db.execute(sql`SELECT add_tag_to_comic(${comicId}, ${tagName})`);

// Or directly with Drizzle
await db
  .update(comics)
  .set({ tags: sql`tags || ${[tagName]}` })
  .where(eq(comics.comicId, comicId));
```

### **Get Comics by Tag:**

```typescript
const actionComics = await db
  .select()
  .from(comics)
  .where(arrayContains(comics.tags, ["Action"]));
```

## 📈 **Performance Features**

### **Indexes:**

- GIN indexes on tag arrays for fast tag searches
- B-tree indexes on foreign keys and frequently queried columns
- Composite indexes for complex queries

### **Query Optimization:**

- Automatic query optimization
- Prepared statements
- Connection pooling

## 🔍 **Type Safety**

### **Inferred Types:**

```typescript
// Types are automatically inferred
type Comic = typeof comics.$inferSelect;
type NewComic = typeof comics.$inferInsert;

// Use in functions
function createComic(data: NewComic) {
  return db.insert(comics).values(data);
}
```

## 🚨 **Migration Notes**

1. **Existing API Routes** - Gradually migrate from raw SQL to Drizzle
2. **Database Functions** - Keep utility functions for complex operations
3. **Performance** - Monitor query performance during migration
4. **Testing** - Test all database operations thoroughly

## 🎯 **Next Steps**

1. **Migrate API Routes** - Convert remaining SQL queries to Drizzle
2. **Add Relations** - Use Drizzle relations for complex joins
3. **Optimize Queries** - Leverage Drizzle's query optimization
4. **Add Tests** - Create comprehensive database tests

## 📚 **Resources**

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [PostgreSQL with Drizzle](https://orm.drizzle.team/docs/get-started-postgresql)
- [Drizzle Kit Commands](https://orm.drizzle.team/kit-docs/overview)

---

**Ready to use Drizzle ORM! 🎉**
