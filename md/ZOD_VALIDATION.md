# Zod Validation Guide

This document explains how to use Zod for validation in this project, with practical examples from the codebase.

## Table of Contents

1. [What is Zod?](#what-is-zod)
2. [Why Use Zod?](#why-use-zod)
3. [Basic Concepts](#basic-concepts)
4. [Where Zod is Used in This Project](#where-zod-is-used-in-this-project)
5. [Schema Definitions](#schema-definitions)
6. [API Route Validation](#api-route-validation)
7. [Response Validation](#response-validation)
8. [Type Inference](#type-inference)
9. [Error Handling](#error-handling)
10. [Advanced Patterns](#advanced-patterns)
11. [Best Practices](#best-practices)

---

## What is Zod?

Zod is a TypeScript-first schema validation library that provides:

- ✅ **Runtime Validation**: Validates data at runtime
- ✅ **Type Safety**: Automatically infers TypeScript types
- ✅ **Error Messages**: Detailed, customizable error messages
- ✅ **Composable**: Build complex schemas from simple ones
- ✅ **Zero Dependencies**: Small bundle size

**Key Benefits:**
- Catch errors before they reach your database
- Type-safe APIs without manual type definitions
- Better developer experience with autocomplete
- Runtime safety for external data (API responses, user input)

---

## Why Use Zod?

### Without Zod

```typescript
// ❌ Manual validation
function createEbook(data: any) {
  if (!data.title || typeof data.title !== "string") {
    throw new Error("Title is required");
  }
  if (!data.author || typeof data.author !== "string") {
    throw new Error("Author is required");
  }
  if (data.title.length < 1) {
    throw new Error("Title cannot be empty");
  }
  // ... more manual checks
}

// Problems:
// - No type safety
// - Repetitive code
// - Easy to miss edge cases
// - No automatic TypeScript types
```

### With Zod

```typescript
// ✅ Declarative validation
import { z } from "zod";

const EbookSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
});

type Ebook = z.infer<typeof EbookSchema>; // Automatic type!

function createEbook(data: unknown) {
  const validated = EbookSchema.parse(data); // Validates and types
  // validated is now typed as { title: string; author: string }
}
```

---

## Basic Concepts

### Installation

Zod is already installed in this project:

```json
{
  "dependencies": {
    "zod": "^3.23.8"
  }
}
```

### Basic Schema Types

```typescript
import { z } from "zod";

// Primitives
z.string();
z.number();
z.boolean();
z.date();
z.null();
z.undefined();

// Arrays and Objects
z.array(z.string());
z.object({ name: z.string() });

// Optional and Nullable
z.string().optional();      // string | undefined
z.string().nullable();      // string | null
z.string().nullish();       // string | null | undefined

// Validation
z.string().min(1);          // Minimum length
z.string().max(100);        // Maximum length
z.number().int();           // Integer only
z.number().positive();      // Positive number
z.string().email();         // Email format
z.string().url();           // URL format
```

---

## Where Zod is Used in This Project

Zod is used in three main places:

1. **Schema Definitions** (`src/lib/schemas/`)
   - Centralized schema definitions
   - Type exports for TypeScript

2. **API Routes** (`src/app/api/`)
   - Input validation (request body, query params, URL params)
   - Output validation (response data)

3. **React Query Hooks** (`src/lib/queries/`)
   - Validating API responses before using them

### Project Structure

```
src/
├── lib/
│   ├── schemas/          # Zod schema definitions
│   │   ├── comics.ts
│   │   ├── movies.ts
│   │   ├── tv-shows.ts
│   │   └── ebooks.ts
│   └── queries/          # React Query hooks (use schemas)
│       ├── comics.ts
│       ├── movies.ts
│       └── ...
└── app/
    └── api/              # API routes (use schemas)
        ├── comic-library/
        ├── movie-library/
        └── ...
```

---

## Schema Definitions

### Example: Ebook Schema

**File: `src/lib/schemas/ebooks.ts`**

```typescript
import { z } from "zod";

// Basic ebook schema (for list view)
export const EbookSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1, "Ebook title is required"),
  author: z.string().min(1, "Ebook author is required"),
  address: z.string().min(1, "Ebook address is required"),
});

// Ebook with bookmarks (for detail view)
export const EbookDetailSchema = EbookSchema.extend({
  bookmarks: z.array(EbookBookmarkSchema),
});

// Bookmark schema
export const EbookBookmarkSchema = z.object({
  bookmark_id: z.number().int().positive(),
  bookmark_name: z.string().min(1, "Bookmark name is required"),
  chapter_title: z.string().nullable(),
  cfi: z.string().min(1, "CFI is required"),
  position_percentage: z.number().min(0).max(100).nullable(),
  created_at: z
    .union([z.string(), z.date()])
    .transform((val) => (val instanceof Date ? val.toISOString() : val)),
  updated_at: z
    .union([z.string(), z.date()])
    .transform((val) => (val instanceof Date ? val.toISOString() : val)),
});

// Query parameters schema
export const EbooksQueryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  search: z.string().nullish(), // Search in title or author
});

// Response schema
export const EbooksResponseSchema = z.object({
  ebooks: z.array(EbookSchema),
  pagination: EbookPaginationInfoSchema,
});

// Type exports (inferred from schemas)
export type Ebook = z.infer<typeof EbookSchema>;
export type EbookDetail = z.infer<typeof EbookDetailSchema>;
export type EbooksQueryParams = z.infer<typeof EbooksQueryParamsSchema>;
export type EbooksResponse = z.infer<typeof EbooksResponseSchema>;
```

### Example: Comic Schema

**File: `src/lib/schemas/comics.ts`**

```typescript
import { z } from "zod";

// Enum schemas
export const ComicTypeSchema = z.enum(["manga", "webtoon", "western"]);
export const ComicStatusSchema = z.enum([
  "ongoing",
  "completed",
  "hiatus",
  "cancelled",
]);

// Main comic schema
export const ComicSchema = z.object({
  comic_id: z.number().int().positive(),
  comic_title: z.string().min(1, "Comic title is required"),
  thumbnail_address: z.string().min(1, "Thumbnail address is required"),
  comic_description: z.string().nullable(),
  number_of_chapters: z.number().int().nonnegative(),
  comic_type: ComicTypeSchema,
  tags: z.array(z.string()),
  views: z.number().int().nonnegative(),
  updated_at: z
    .union([z.string(), z.date()])
    .transform((val) => (val instanceof Date ? val.toISOString() : val)),
  status: ComicStatusSchema,
  chapters: z.array(ComicChapterSchema).optional(),
  recentChapters: z.array(RecentChapterSchema),
});

// Create comic data schema (for POST requests)
export const CreateComicDataSchema = z.object({
  comic_title: z.string().min(1, "Comic title is required"),
  thumbnail_address: z.string().min(1, "Thumbnail address is required"),
  comic_description: z.string().optional(),
  comic_type: ComicTypeSchema,
  tags: z.array(z.string()).optional(),
});

// Update comic data schema (partial of create)
export const UpdateComicDataSchema = CreateComicDataSchema.partial();

// Query parameters with coercion and defaults
export const ComicsQueryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  itemsPerPage: z.coerce.number().int().positive().max(100).default(25),
  tag: z.string().nullish(),
  search: z.string().nullish(),
  type: ComicTypeSchema.or(z.literal("all")).nullish(),
  status: ComicStatusSchema.or(z.literal("all")).nullish(),
  sort: SortOptionSchema.default("az-asc"),
});
```

### Key Schema Patterns

**1. Coercion (Converting Types)**

```typescript
// Convert string to number automatically
z.coerce.number().int().positive()

// Example: URL param "123" becomes number 123
const ebookId = z.coerce.number().int().positive().parse("123");
```

**2. Default Values**

```typescript
z.string().default("default-value");
z.number().int().positive().default(1);
```

**3. Transformations**

```typescript
// Transform Date to ISO string
z.union([z.string(), z.date()])
  .transform((val) => (val instanceof Date ? val.toISOString() : val));
```

**4. Preprocessing**

```typescript
// Preprocess before validation
z.preprocess(
  (val) => (val === null || val === undefined ? "az-asc" : val),
  SortOptionSchema
);
```

**5. Extending Schemas**

```typescript
// Extend a base schema
const BaseSchema = z.object({ id: z.number() });
const ExtendedSchema = BaseSchema.extend({ name: z.string() });
```

**6. Partial Schemas**

```typescript
// Make all fields optional
const UpdateSchema = CreateSchema.partial();
```

---

## API Route Validation

### Example 1: Input Validation (Request Body)

**File: `src/app/api/auth/setup/route.ts`**

```typescript
import { z } from "zod";

const SetupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Parse and validate request body
    const { username, password } = SetupSchema.parse(body);
    
    // Use validated data...
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join(", "),
        },
        { status: 400 }
      );
    }
    // Handle other errors...
  }
}
```

### Example 2: URL Parameter Validation

**File: `src/app/api/ebook-library/[ebook]/route.ts`**

```typescript
import { z } from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ebook: string }> }
) {
  try {
    const { ebook } = await params;

    // Validate and coerce URL parameter
    const ebookId = z.coerce.number().int().positive().parse(ebook);

    // Use validated ebookId...
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorResponse = EbookApiErrorSchema.parse({
        error: "Invalid ebook ID",
        details: error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", "),
      });
      return NextResponse.json(errorResponse, { status: 400 });
    }
  }
}
```

### Example 3: Query Parameter Validation

**File: `src/app/api/movie-library/route.ts`**

```typescript
import { MoviesQueryParamsSchema } from "@/lib/schemas/movies";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Convert URLSearchParams to object
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Validate query parameters
    const validatedParams = MoviesQueryParamsSchema.parse(queryParams);
    
    // validatedParams is typed and validated:
    // {
    //   page: number (default: 1)
    //   itemsPerPage: number (default: 25, max: 100)
    //   tag?: string | null
    //   genre?: string | null
    //   search?: string | null
    //   sort: "az-asc" | "za-desc" | ...
    // }
    
    // Use validated params...
  } catch (error) {
    if (error instanceof ZodError) {
      // Handle validation error...
    }
  }
}
```

### Example 4: FormData Validation

**File: `src/app/api/settings/manage-movies/create-movie/route.ts`**

```typescript
import { z } from "zod";

const CreateMovieDataSchema = z.object({
  title: z.string().min(1, "Movie title is required"),
  sprite_address: z.string().url("Sprite address must be a valid URL"),
  thumbnail_address: z.string().url("Thumbnail address must be a valid URL"),
  master_playlist_address: z.string().url("Master playlist address must be a valid URL"),
  tags: z.array(z.string()).default([]),
  genres: z.array(z.string()).default([]),
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract and validate form data
    const data = {
      title: formData.get("title") as string,
      sprite_address: formData.get("sprite_address") as string,
      thumbnail_address: formData.get("thumbnail_address") as string,
      master_playlist_address: formData.get("master_playlist_address") as string,
      tags: JSON.parse(formData.get("tags") as string || "[]"),
      genres: JSON.parse(formData.get("genres") as string || "[]"),
    };
    
    // Validate with Zod
    const validated = CreateMovieDataSchema.parse(data);
    
    // Use validated data...
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Handle validation error...
    }
  }
}
```

---

## Response Validation

### Why Validate Responses?

Validating API responses ensures:
- Data matches expected structure
- Type safety at runtime
- Early detection of API contract changes
- Better error messages

### Example: Validating API Response

**File: `src/app/api/ebook-library/[ebook]/route.ts`**

```typescript
import { EbookDetailSchema, EbookApiErrorSchema } from "@/lib/schemas/ebooks";

export async function GET(request: NextRequest, { params }) {
  try {
    // ... fetch ebook data from database ...
    
    const formattedEbook = {
      id: ebookData.id,
      title: ebookData.ebookTitle,
      author: ebookData.ebookAuthor,
      address: ebookData.ebookAddress,
      bookmarks,
    };

    // Validate response before sending
    const validationResult = EbookDetailSchema.safeParse(formattedEbook);

    if (!validationResult.success) {
      console.error(
        "Response validation failed:",
        JSON.stringify(validationResult.error.issues, null, 2)
      );
      return NextResponse.json(
        {
          error: "Response validation failed",
          details: validationResult.error.issues,
        },
        { status: 500 }
      );
    }

    // Return validated data (typed correctly)
    return NextResponse.json(validationResult.data);
  } catch (error) {
    // Handle errors...
  }
}
```

### Example: Validating in React Query

**File: `src/lib/queries/comics.ts`**

```typescript
import { ComicsResponseSchema } from "@/lib/schemas/comics";

export function useComicsWithFilters(page: number, filters) {
  return useQuery({
    queryKey: ["comics", page, filters],
    queryFn: async (): Promise<ComicsResponse> => {
      const response = await fetch(`/api/comic-library?${params}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch comics");
      }

      const data = await response.json();

      // Validate response with Zod schema
      const validationResult = ComicsResponseSchema.safeParse(data);

      if (!validationResult.success) {
        console.error(
          "Frontend validation failed:",
          validationResult.error.issues
        );
        console.error("Received data:", data);
        throw new Error(
          `Validation failed: ${validationResult.error.issues[0]?.message}`
        );
      }

      // Return validated data (typed correctly)
      return validationResult.data;
    },
  });
}
```

---

## Type Inference

### Automatic Type Generation

Zod automatically generates TypeScript types from schemas:

```typescript
import { z } from "zod";

const EbookSchema = z.object({
  id: z.number(),
  title: z.string(),
  author: z.string(),
});

// Infer TypeScript type from schema
type Ebook = z.infer<typeof EbookSchema>;
// Result: { id: number; title: string; author: string; }
```

### Project Pattern

**File: `src/lib/schemas/ebooks.ts`**

```typescript
// Define schema
export const EbookSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  author: z.string().min(1),
  address: z.string().min(1),
});

// Export type (inferred from schema)
export type Ebook = z.infer<typeof EbookSchema>;

// Usage in other files
import type { Ebook } from "@/lib/schemas/ebooks";

function processEbook(ebook: Ebook) {
  // ebook is fully typed!
  console.log(ebook.title); // TypeScript knows this is a string
}
```

**Benefits:**
- Single source of truth (schema defines both validation and types)
- No manual type definitions
- Types stay in sync with validation
- Better autocomplete in IDE

---

## Error Handling

### Parse vs SafeParse

**`.parse()`** - Throws error on validation failure:

```typescript
try {
  const data = EbookSchema.parse(invalidData);
} catch (error) {
  if (error instanceof z.ZodError) {
    // Handle validation error
    console.error(error.issues);
  }
}
```

**`.safeParse()`** - Returns result object:

```typescript
const result = EbookSchema.safeParse(data);

if (result.success) {
  // result.data is typed and validated
  console.log(result.data);
} else {
  // result.error contains ZodError
  console.error(result.error.issues);
}
```

### Error Format

**ZodError Structure:**

```typescript
{
  issues: [
    {
      path: ["title"],           // Field path
      message: "Required",       // Error message
      code: "invalid_type",      // Error code
    },
    {
      path: ["author"],
      message: "String must contain at least 1 character(s)",
      code: "too_small",
    },
  ],
}
```

### Project Error Handling Pattern

**File: `src/app/api/auth/setup/route.ts`**

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = SetupSchema.parse(body);
    
    // ... process request ...
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join(", "),
        },
        { status: 400 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      {
        error: "Failed to create master account",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

### Error Schema Pattern

**File: `src/lib/schemas/ebooks.ts`**

```typescript
// API Error Schema
export const EbookApiErrorSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
});

export type EbookApiError = z.infer<typeof EbookApiErrorSchema>;
```

**Usage:**

```typescript
// Validate error response before sending
const errorResponse = EbookApiErrorSchema.parse({
  error: "Invalid ebook ID",
  details: error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join(", "),
});

return NextResponse.json(errorResponse, { status: 400 });
```

---

## Advanced Patterns

### Pattern 1: Coercion for URL Parameters

**Converting string params to numbers:**

```typescript
// URL: /api/ebook-library/123
const { ebook } = await params;

// Coerce string "123" to number 123
const ebookId = z.coerce.number().int().positive().parse(ebook);
```

### Pattern 2: Preprocessing Query Parameters

**File: `src/lib/schemas/movies.ts`**

```typescript
export const MoviesQueryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  itemsPerPage: z.coerce.number().int().positive().max(100).default(25),
  sort: z.preprocess(
    (val) => (val === null || val === undefined ? "az-asc" : val),
    MovieSortOptionSchema
  ),
});
```

### Pattern 3: Date Transformations

**Handling Date objects from database:**

```typescript
export const EbookBookmarkSchema = z.object({
  created_at: z
    .union([z.string(), z.date()])
    .transform((val) => (val instanceof Date ? val.toISOString() : val)),
  updated_at: z
    .union([z.string(), z.date()])
    .transform((val) => (val instanceof Date ? val.toISOString() : val)),
});
```

### Pattern 4: Enum with Literal Union

**File: `src/lib/schemas/comics.ts`**

```typescript
export const ComicsQueryParamsSchema = z.object({
  type: ComicTypeSchema.or(z.literal("all")).nullish(),
  status: ComicStatusSchema.or(z.literal("all")).nullish(),
});
```

### Pattern 5: Extending Schemas

```typescript
// Base schema
const EbookSchema = z.object({
  id: z.number(),
  title: z.string(),
  author: z.string(),
});

// Extended schema (adds bookmarks)
const EbookDetailSchema = EbookSchema.extend({
  bookmarks: z.array(EbookBookmarkSchema),
});
```

### Pattern 6: Partial for Updates

```typescript
// Create schema (all fields required)
const CreateComicDataSchema = z.object({
  comic_title: z.string().min(1),
  comic_type: ComicTypeSchema,
  tags: z.array(z.string()).optional(),
});

// Update schema (all fields optional)
export const UpdateComicDataSchema = CreateComicDataSchema.partial();
```

### Pattern 7: Nested Objects

```typescript
export const ChapterDataSchema = z.object({
  comic: z.object({
    comic_id: z.number().int().positive(),
    comic_title: z.string().min(1),
  }),
  chapter: z.object({
    chapter_number: z.coerce.number().positive(),
    image_count: z.number().int().nonnegative(),
    favorite: z.boolean(),
  }),
  images: z.array(ChapterImageSchema),
});
```

---

## Best Practices

### 1. Centralize Schema Definitions

**✅ Good: Centralized schemas**

```typescript
// src/lib/schemas/ebooks.ts
export const EbookSchema = z.object({ ... });
export type Ebook = z.infer<typeof EbookSchema>;
```

**❌ Bad: Schemas scattered across files**

```typescript
// In API route
const schema = z.object({ ... });

// In another file
const schema = z.object({ ... });
```

### 2. Use Type Inference

**✅ Good: Infer types from schemas**

```typescript
export const EbookSchema = z.object({ ... });
export type Ebook = z.infer<typeof EbookSchema>;
```

**❌ Bad: Manual type definitions**

```typescript
export type Ebook = {
  id: number;
  title: string;
  // ... manually defined, can get out of sync
};
```

### 3. Validate Both Input and Output

**✅ Good: Validate requests and responses**

```typescript
// Validate input
const validated = RequestSchema.parse(requestBody);

// Validate output
const response = ResponseSchema.safeParse(data);
```

**❌ Bad: Only validate input**

```typescript
// Only validating input
const validated = RequestSchema.parse(requestBody);
// No response validation - bugs can slip through
```

### 4. Use SafeParse for External Data

**✅ Good: Use safeParse for API responses**

```typescript
const result = EbookSchema.safeParse(apiResponse);
if (!result.success) {
  // Handle error gracefully
  return;
}
// Use result.data
```

**❌ Bad: Using parse (throws on error)**

```typescript
// Throws error if validation fails
const data = EbookSchema.parse(apiResponse);
```

### 5. Provide Clear Error Messages

**✅ Good: Descriptive error messages**

```typescript
z.string().min(1, "Ebook title is required")
z.string().min(8, "Password must be at least 8 characters")
```

**❌ Bad: Generic error messages**

```typescript
z.string().min(1) // Uses default message
```

### 6. Use Coercion for URL/Query Params

**✅ Good: Coerce string params to numbers**

```typescript
const ebookId = z.coerce.number().int().positive().parse(ebookParam);
```

**❌ Bad: Manual conversion**

```typescript
const ebookId = parseInt(ebookParam); // Can be NaN, no validation
```

### 7. Handle ZodErrors Explicitly

**✅ Good: Explicit error handling**

```typescript
try {
  const data = Schema.parse(input);
} catch (error) {
  if (error instanceof z.ZodError) {
    // Handle validation error
  } else {
    // Handle other errors
  }
}
```

### 8. Use Transform for Data Normalization

**✅ Good: Normalize dates**

```typescript
z.union([z.string(), z.date()])
  .transform((val) => (val instanceof Date ? val.toISOString() : val));
```

### 9. Create Reusable Schema Components

**✅ Good: Reusable components**

```typescript
const PaginationSchema = z.object({
  currentPage: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  // ...
});

// Reuse in multiple response schemas
const EbooksResponseSchema = z.object({
  ebooks: z.array(EbookSchema),
  pagination: PaginationSchema,
});
```

### 10. Export Both Schema and Type

**✅ Good: Export both**

```typescript
export const EbookSchema = z.object({ ... });
export type Ebook = z.infer<typeof EbookSchema>;
```

---

## Common Validation Patterns

### Pattern 1: URL Validation

```typescript
z.string().url("Must be a valid URL");
```

### Pattern 2: Email Validation

```typescript
z.string().email("Must be a valid email address");
```

### Pattern 3: Number Ranges

```typescript
z.number().int().positive();           // > 0
z.number().int().nonnegative();        // >= 0
z.number().min(0).max(100);            // 0-100
```

### Pattern 4: String Length

```typescript
z.string().min(1);                     // At least 1 character
z.string().min(3).max(50);            // 3-50 characters
```

### Pattern 5: Array Validation

```typescript
z.array(z.string());                   // Array of strings
z.array(z.string()).min(1);            // At least 1 item
z.array(z.string()).max(10);           // At most 10 items
```

### Pattern 6: Optional Fields

```typescript
z.string().optional();                 // string | undefined
z.string().nullable();                 // string | null
z.string().nullish();                  // string | null | undefined
```

### Pattern 7: Default Values

```typescript
z.string().default("default-value");
z.number().int().positive().default(1);
```

### Pattern 8: Custom Validation

```typescript
z.string().refine(
  (val) => val.length >= 8,
  { message: "Must be at least 8 characters" }
);
```

---

## Integration with React Hook Form

Zod can be used with React Hook Form via `@hookform/resolvers`:

```typescript
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";

const ebookSchema = z.object({
  ebookTitle: z.string().min(1, "Title is required"),
  ebookAuthor: z.string().min(1, "Author is required"),
  ebookFile: z
    .instanceof(FileList)
    .refine((files) => files.length > 0, "File is required"),
});

type EbookFormData = z.infer<typeof ebookSchema>;

export function CreateEbookForm() {
  const form = useForm<EbookFormData>({
    resolver: zodResolver(ebookSchema),
    defaultValues: {
      ebookTitle: "",
      ebookAuthor: "",
      ebookFile: undefined,
    },
  });

  // Validation is automatically handled by Zod
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
      </form>
    </Form>
  );
}
```

See `md/REACT_HOOK_FORM.md` for more details.

---

## Summary

Zod provides:

- ✅ **Runtime Validation**: Validates data at runtime
- ✅ **Type Safety**: Automatic TypeScript type inference
- ✅ **Error Messages**: Detailed, customizable errors
- ✅ **Composable**: Build complex schemas from simple ones

**Key Takeaways:**

1. Define schemas in `src/lib/schemas/`
2. Validate both input (requests) and output (responses)
3. Use `z.infer<>` for automatic type generation
4. Use `safeParse()` for external data, `parse()` for trusted data
5. Handle `ZodError` explicitly in error handling
6. Use coercion for URL/query parameters
7. Export both schema and type from schema files

**Where Zod is Used:**

- ✅ **Schema Definitions**: `src/lib/schemas/`
- ✅ **API Routes**: Input/output validation
- ✅ **React Query**: Response validation
- ✅ **Forms**: With React Hook Form (via zodResolver)

**Next Steps:**

- Review existing schemas in `src/lib/schemas/`
- Create new schemas following the project patterns
- Validate all API inputs and outputs
- Use type inference instead of manual types

