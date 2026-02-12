# React Query (TanStack Query) Guide

This document explains how to use React Query (TanStack Query) in this project, with practical examples and best practices.

## Table of Contents

1. [What is React Query?](#what-is-react-query)
2. [Why Use React Query?](#why-use-react-query)
3. [Setup and Configuration](#setup-and-configuration)
4. [Basic Concepts](#basic-concepts)
5. [Simple Examples](#simple-examples)
6. [Query Keys](#query-keys)
7. [Mutations](#mutations)
8. [Advanced Patterns](#advanced-patterns)
9. [Best Practices](#best-practices)

---

## What is React Query?

React Query (now called TanStack Query) is a powerful data-fetching library for React that provides:

- ✅ **Automatic Caching**: Data is cached and shared across components
- ✅ **Background Refetching**: Keeps data fresh automatically
- ✅ **Loading & Error States**: Built-in state management
- ✅ **Optimistic Updates**: Update UI before server confirms
- ✅ **Pagination & Infinite Queries**: Built-in support
- ✅ **DevTools**: Visual debugging interface

**Key Benefits:**
- Reduces boilerplate code
- Improves performance with smart caching
- Better user experience with loading states
- Automatic background synchronization

---

## Why Use React Query?

### Without React Query

```typescript
// ❌ Manual state management
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  setLoading(true);
  fetch("/api/ebooks")
    .then((res) => res.json())
    .then((data) => {
      setData(data);
      setLoading(false);
    })
    .catch((err) => {
      setError(err);
      setLoading(false);
    });
}, []);

// Problems:
// - Manual loading/error state
// - No caching
// - No automatic refetching
// - Duplicate requests
// - No background updates
```

### With React Query

```typescript
// ✅ Declarative data fetching
const { data, isLoading, error } = useQuery({
  queryKey: ["ebooks"],
  queryFn: () => fetch("/api/ebooks").then((res) => res.json()),
});

// Benefits:
// - Automatic caching
// - Loading/error states handled
// - Background refetching
// - Shared cache across components
// - Less boilerplate
```

---

## Setup and Configuration

### Installation

React Query is already installed in this project:

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.90.2",
    "@tanstack/react-query-devtools": "^5.90.2"
  }
}
```

### QueryProvider Setup

The project has a `QueryProvider` component that wraps the app:

**File: `src/components/providers/QueryProvider.tsx`**

```typescript
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 10, // 10 minutes
            retry: (failureCount, error: any) => {
              // Don't retry on 4xx errors
              if (error?.status >= 400 && error?.status < 500) {
                return false;
              }
              // Retry up to 3 times for other errors
              return failureCount < 3;
            },
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000),
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools only in development */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
```

**Configuration Explained:**

- **`staleTime`**: How long data is considered fresh (5 minutes)
- **`gcTime`**: How long unused data stays in cache (10 minutes)
- **`retry`**: Custom retry logic (don't retry 4xx errors)
- **`refetchOnWindowFocus`**: Refetch when window regains focus (disabled)
- **`refetchOnReconnect`**: Refetch when network reconnects (enabled)

### Usage in Layout

The `QueryProvider` is used in the root layout:

```typescript
// src/app/layout.tsx
import { QueryProvider } from "@/components/providers/QueryProvider";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
```

---

## Basic Concepts

### Query vs Mutation

**Query**: Fetching data (GET requests)
- Read-only operations
- Automatically cached
- Can be refetched

**Mutation**: Modifying data (POST, PUT, DELETE)
- Write operations
- Not cached
- Manual execution

### Query States

Every query has these states:

```typescript
const {
  data,           // The fetched data
  isLoading,       // Initial loading (no data yet)
  isFetching,      // Currently fetching (may have cached data)
  isError,         // Error occurred
  error,           // Error object
  isSuccess,      // Query succeeded
  refetch,         // Function to manually refetch
} = useQuery({ ... });
```

---

## Simple Examples

### Example 1: Basic Query

**Simple data fetching:**

```typescript
import { useQuery } from "@tanstack/react-query";

function EbookList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ebooks"],
    queryFn: async () => {
      const response = await fetch("/api/ebook-library");
      if (!response.ok) {
        throw new Error("Failed to fetch ebooks");
      }
      return response.json();
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.ebooks?.map((ebook) => (
        <div key={ebook.id}>{ebook.title}</div>
      ))}
    </div>
  );
}
```

### Example 2: Query with Parameters

**Fetching a single ebook:**

```typescript
import { useQuery } from "@tanstack/react-query";

function EbookDetail({ ebookId }: { ebookId: number }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ebook", ebookId],
    queryFn: async () => {
      const response = await fetch(`/api/ebook-library/${ebookId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch ebook");
      }
      return response.json();
    },
    enabled: !!ebookId, // Only fetch if ebookId exists
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return <div>Ebook not found</div>;

  return (
    <div>
      <h1>{data.title}</h1>
      <p>Author: {data.author}</p>
    </div>
  );
}
```

### Example 3: Query with Filters

**Fetching filtered data (from project):**

```typescript
// src/lib/queries/ebooks.ts
import { useQuery } from "@tanstack/react-query";

export function useEbooks(page: number = 1, search: string = "") {
  return useQuery({
    queryKey: ["ebooks", page, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        itemsPerPage: "25",
      });
      if (search) params.append("search", search);

      const response = await fetch(`/api/ebook-library?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch ebooks");
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Usage in component
function EbookLibrary() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useEbooks(page, search);

  // Component renders data...
}
```

### Example 4: Custom Hook Pattern

**Creating reusable query hooks (project pattern):**

```typescript
// src/lib/queries/tags.ts
import { useQuery } from "@tanstack/react-query";

export interface TagsResponse {
  tags: string[];
}

const fetchTags = async (): Promise<string[]> => {
  const response = await fetch("/api/tags");
  if (!response.ok) {
    throw new Error("Failed to fetch tags");
  }
  const data: TagsResponse = await response.json();
  return data.tags;
};

export const useTags = () => {
  return useQuery({
    queryKey: ["tags"],
    queryFn: fetchTags,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Usage
function TagSelector() {
  const { data: tags, isLoading } = useTags();

  if (isLoading) return <div>Loading tags...</div>;

  return (
    <select>
      {tags?.map((tag) => (
        <option key={tag} value={tag}>
          {tag}
        </option>
      ))}
    </select>
  );
}
```

---

## Query Keys

### What are Query Keys?

Query keys uniquely identify queries in the cache. They're used for:
- Caching
- Invalidation
- Refetching
- Sharing data between components

### Simple Query Keys

```typescript
// Single string
queryKey: ["ebooks"]

// Array with parameters
queryKey: ["ebook", ebookId]

// Nested structure
queryKey: ["ebooks", "list", { page: 1, search: "test" }]
```

### Query Key Factories (Project Pattern)

**Organized query keys for better management:**

```typescript
// src/lib/queries/comics.ts
export const comicKeys = {
  all: ["comics"] as const,
  lists: () => [...comicKeys.all, "list"] as const,
  list: (filters: string) => [...comicKeys.lists(), { filters }] as const,
  details: () => [...comicKeys.all, "detail"] as const,
  detail: (id: number) => [...comicKeys.details(), id] as const,
  tags: () => [...comicKeys.all, "tags"] as const,
};

// Usage
useQuery({
  queryKey: comicKeys.list(JSON.stringify({ page: 1, search: "" })),
  queryFn: fetchComics,
});

useQuery({
  queryKey: comicKeys.detail(comicId),
  queryFn: () => fetchComic(comicId),
});

// Invalidation
queryClient.invalidateQueries({ queryKey: comicKeys.lists() }); // All lists
queryClient.invalidateQueries({ queryKey: comicKeys.detail(comicId) }); // Specific comic
```

**Benefits:**
- Type-safe query keys
- Easy to invalidate related queries
- Consistent key structure
- Prevents typos

### Query Key Best Practices

```typescript
// ✅ Good: Hierarchical structure
queryKey: ["ebooks", "list", { page: 1 }]
queryKey: ["ebooks", "detail", ebookId]

// ✅ Good: Use factories
const ebookKeys = {
  all: ["ebooks"] as const,
  lists: () => [...ebookKeys.all, "list"] as const,
  list: (filters) => [...ebookKeys.lists(), filters] as const,
  detail: (id) => [...ebookKeys.all, "detail", id] as const,
};

// ❌ Bad: Inconsistent keys
queryKey: ["ebooks"]
queryKey: ["ebook-list"]
queryKey: ["ebook", "detail", id]
```

---

## Mutations

### Basic Mutation

**Creating and using mutations:**

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";

function CreateEbookForm() {
  const queryClient = useQueryClient();

  const createEbookMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/settings/manage-ebooks/create-ebook", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create ebook");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch ebooks list
      queryClient.invalidateQueries({ queryKey: ["ebooks"] });
    },
    onError: (error) => {
      console.error("Failed to create ebook:", error);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createEbookMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button
        type="submit"
        disabled={createEbookMutation.isPending}
      >
        {createEbookMutation.isPending ? "Creating..." : "Create Ebook"}
      </button>
      {createEbookMutation.isError && (
        <div>Error: {createEbookMutation.error.message}</div>
      )}
    </form>
  );
}
```

### Mutation States

```typescript
const mutation = useMutation({ ... });

mutation.isPending;    // Mutation is in progress
mutation.isError;      // Mutation failed
mutation.isSuccess;   // Mutation succeeded
mutation.error;       // Error object
mutation.data;        // Response data
mutation.reset();     // Reset mutation state
```

### Example: Delete Mutation

**From project (`src/app/settings/manage-ebooks/page.tsx`):**

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";

function DeleteEbookButton({ ebookId }: { ebookId: number }) {
  const queryClient = useQueryClient();

  const deleteEbookMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(
        `/api/settings/manage-ebooks/delete-ebook?id=${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete ebook");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["ebooks"] });
    },
  });

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this ebook?")) {
      deleteEbookMutation.mutate(ebookId);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deleteEbookMutation.isPending}
    >
      {deleteEbookMutation.isPending ? "Deleting..." : "Delete"}
    </button>
  );
}
```

### Example: Custom Mutation Hook

**Reusable mutation hook (project pattern):**

```typescript
// src/lib/queries/comics.ts
export function useCreateComic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateComicData): Promise<Comic> => {
      const response = await fetch("/api/comic-library", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create comic");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch comics list
      queryClient.invalidateQueries({ queryKey: comicKeys.lists() });
    },
  });
}

// Usage
function CreateComicForm() {
  const createComicMutation = useCreateComic();

  const handleSubmit = (data: CreateComicData) => {
    createComicMutation.mutate(data, {
      onSuccess: () => {
        alert("Comic created successfully!");
      },
    });
  };

  // Form JSX...
}
```

---

## Advanced Patterns

### Example 5: Optimistic Updates

**Update UI before server confirms:**

```typescript
const updateEbookMutation = useMutation({
  mutationFn: async ({ id, title }: { id: number; title: string }) => {
    const response = await fetch(`/api/ebook-library/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) throw new Error("Failed to update");
    return response.json();
  },
  onMutate: async ({ id, title }) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ["ebook", id] });

    // Snapshot previous value
    const previousEbook = queryClient.getQueryData(["ebook", id]);

    // Optimistically update
    queryClient.setQueryData(["ebook", id], (old: any) => ({
      ...old,
      title,
    }));

    // Return context for rollback
    return { previousEbook };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    if (context?.previousEbook) {
      queryClient.setQueryData(["ebook", variables.id], context.previousEbook);
    }
  },
  onSettled: (data, error, variables) => {
    // Refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey: ["ebook", variables.id] });
  },
});
```

### Example 6: Dependent Queries

**Query that depends on another query:**

```typescript
function EbookWithBookmarks({ ebookId }: { ebookId: number }) {
  // First query: Get ebook
  const { data: ebook } = useQuery({
    queryKey: ["ebook", ebookId],
    queryFn: () => fetchEbook(ebookId),
  });

  // Second query: Get bookmarks (only if ebook exists)
  const { data: bookmarks } = useQuery({
    queryKey: ["ebook", ebookId, "bookmarks"],
    queryFn: () => fetchBookmarks(ebookId),
    enabled: !!ebook, // Only fetch if ebook exists
  });

  if (!ebook) return <div>Loading ebook...</div>;
  if (!bookmarks) return <div>Loading bookmarks...</div>;

  return (
    <div>
      <h1>{ebook.title}</h1>
      <ul>
        {bookmarks.map((bookmark) => (
          <li key={bookmark.id}>{bookmark.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Example 7: Pagination

**Paginated queries:**

```typescript
function EbookLibrary() {
  const [page, setPage] = useState(1);
  const itemsPerPage = 25;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["ebooks", page],
    queryFn: async () => {
      const response = await fetch(
        `/api/ebook-library?page=${page}&itemsPerPage=${itemsPerPage}`
      );
      return response.json();
    },
    keepPreviousData: true, // Keep previous page data while fetching
  });

  return (
    <div>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <>
          {data?.ebooks?.map((ebook) => (
            <div key={ebook.id}>{ebook.title}</div>
          ))}
          <div>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span>Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!data?.hasMore}
            >
              Next
            </button>
          </div>
          {isFetching && <div>Fetching...</div>}
        </>
      )}
    </div>
  );
}
```

### Example 8: Manual Refetching

**Trigger refetch manually:**

```typescript
function EbookList() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["ebooks"],
    queryFn: fetchEbooks,
  });

  return (
    <div>
      <button onClick={() => refetch()}>Refresh</button>
      {isFetching && <div>Refreshing...</div>}
      {/* Render data */}
    </div>
  );
}
```

### Example 9: Query Invalidation

**Invalidate queries to trigger refetch:**

```typescript
import { useQueryClient } from "@tanstack/react-query";

function CreateEbookForm() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createEbook,
    onSuccess: () => {
      // Invalidate all ebook queries
      queryClient.invalidateQueries({ queryKey: ["ebooks"] });

      // Or invalidate specific query
      queryClient.invalidateQueries({ queryKey: ["ebooks", "list"] });

      // Or invalidate with predicate
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "ebooks",
      });
    },
  });

  // Form JSX...
}
```

### Example 10: Prefetching

**Prefetch data before it's needed:**

```typescript
import { useQueryClient } from "@tanstack/react-query";

function EbookCard({ ebookId }: { ebookId: number }) {
  const queryClient = useQueryClient();

  const handleMouseEnter = () => {
    // Prefetch ebook details on hover
    queryClient.prefetchQuery({
      queryKey: ["ebook", ebookId],
      queryFn: () => fetchEbook(ebookId),
    });
  };

  return (
    <div onMouseEnter={handleMouseEnter}>
      {/* Card content */}
    </div>
  );
}
```

---

## Best Practices

### 1. Use Custom Hooks

**Create reusable query hooks:**

```typescript
// ✅ Good: Reusable hook
// src/lib/queries/ebooks.ts
export function useEbook(id: number) {
  return useQuery({
    queryKey: ["ebook", id],
    queryFn: () => fetchEbook(id),
    enabled: !!id,
  });
}

// Usage
function EbookPage({ id }: { id: number }) {
  const { data, isLoading } = useEbook(id);
  // ...
}

// ❌ Bad: Inline query
function EbookPage({ id }: { id: number }) {
  const { data } = useQuery({
    queryKey: ["ebook", id],
    queryFn: () => fetch(`/api/ebook/${id}`).then((r) => r.json()),
  });
  // ...
}
```

### 2. Organize Query Keys

**Use query key factories:**

```typescript
// ✅ Good: Organized keys
export const ebookKeys = {
  all: ["ebooks"] as const,
  lists: () => [...ebookKeys.all, "list"] as const,
  list: (filters) => [...ebookKeys.lists(), filters] as const,
  detail: (id) => [...ebookKeys.all, "detail", id] as const,
};

// ❌ Bad: Inconsistent keys
queryKey: ["ebooks"]
queryKey: ["ebook-list"]
queryKey: ["ebook", id]
```

### 3. Handle Errors Gracefully

```typescript
// ✅ Good: Proper error handling
const { data, isLoading, error } = useQuery({
  queryKey: ["ebooks"],
  queryFn: async () => {
    const response = await fetch("/api/ebook-library");
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch ebooks");
    }
    return response.json();
  },
  retry: (failureCount, error) => {
    // Don't retry on 4xx errors
    if (error?.status >= 400 && error?.status < 500) {
      return false;
    }
    return failureCount < 3;
  },
});

// ❌ Bad: No error handling
const { data } = useQuery({
  queryKey: ["ebooks"],
  queryFn: () => fetch("/api/ebook-library").then((r) => r.json()),
});
```

### 4. Validate Responses

**Use Zod for type-safe validation:**

```typescript
import { z } from "zod";

const EbookSchema = z.object({
  id: z.number(),
  title: z.string(),
  author: z.string(),
});

export function useEbook(id: number) {
  return useQuery({
    queryKey: ["ebook", id],
    queryFn: async () => {
      const response = await fetch(`/api/ebook-library/${id}`);
      if (!response.ok) throw new Error("Failed to fetch");
      
      const data = await response.json();
      
      // Validate with Zod
      const validationResult = EbookSchema.safeParse(data);
      if (!validationResult.success) {
        throw new Error("Invalid response format");
      }
      
      return validationResult.data;
    },
  });
}
```

### 5. Set Appropriate Stale Times

```typescript
// ✅ Good: Set stale time based on data type
useQuery({
  queryKey: ["tags"],
  queryFn: fetchTags,
  staleTime: 1000 * 60 * 30, // 30 minutes (tags don't change often)
});

useQuery({
  queryKey: ["ebooks"],
  queryFn: fetchEbooks,
  staleTime: 1000 * 60 * 5, // 5 minutes (ebooks change more often)
});

// ❌ Bad: No stale time (refetches too often)
useQuery({
  queryKey: ["ebooks"],
  queryFn: fetchEbooks,
  // No staleTime - refetches on every mount
});
```

### 6. Invalidate Related Queries

**Invalidate related queries after mutations:**

```typescript
const createEbookMutation = useMutation({
  mutationFn: createEbook,
  onSuccess: (data) => {
    // Invalidate list queries
    queryClient.invalidateQueries({ queryKey: ["ebooks", "list"] });
    
    // Update specific query with new data
    queryClient.setQueryData(["ebook", data.id], data);
  },
});
```

### 7. Use Enabled Option

**Conditionally enable queries:**

```typescript
// ✅ Good: Only fetch when needed
const { data } = useQuery({
  queryKey: ["ebook", ebookId],
  queryFn: () => fetchEbook(ebookId),
  enabled: !!ebookId, // Only fetch if ebookId exists
});

// ✅ Good: Dependent query
const { data: bookmarks } = useQuery({
  queryKey: ["bookmarks", ebookId],
  queryFn: () => fetchBookmarks(ebookId),
  enabled: !!ebook && user.isAuthenticated, // Only if ebook exists and user is authenticated
});
```

### 8. Handle Loading States Properly

```typescript
// ✅ Good: Distinguish between initial load and refetch
const { data, isLoading, isFetching } = useQuery({
  queryKey: ["ebooks"],
  queryFn: fetchEbooks,
});

return (
  <div>
    {isLoading ? (
      <div>Loading...</div> // Initial load
    ) : (
      <>
        {data?.ebooks?.map(...)}
        {isFetching && <div>Refreshing...</div>} // Background refetch
      </>
    )}
  </div>
);
```

### 9. Use Query Client Methods

```typescript
import { useQueryClient } from "@tanstack/react-query";

function MyComponent() {
  const queryClient = useQueryClient();

  // Invalidate queries
  queryClient.invalidateQueries({ queryKey: ["ebooks"] });

  // Refetch queries
  queryClient.refetchQueries({ queryKey: ["ebooks"] });

  // Get query data
  const cachedData = queryClient.getQueryData(["ebook", 1]);

  // Set query data
  queryClient.setQueryData(["ebook", 1], newData);

  // Remove query
  queryClient.removeQueries({ queryKey: ["ebook", 1] });
}
```

### 10. TypeScript Support

**Type your queries:**

```typescript
// ✅ Good: Type-safe queries
type Ebook = {
  id: number;
  title: string;
  author: string;
};

export function useEbook(id: number) {
  return useQuery<Ebook>({
    queryKey: ["ebook", id],
    queryFn: async (): Promise<Ebook> => {
      const response = await fetch(`/api/ebook-library/${id}`);
      return response.json();
    },
  });
}

// Usage
const { data } = useEbook(1);
// data is typed as Ebook | undefined
```

---

## Common Patterns in This Project

### Pattern 1: Filtered List Query

```typescript
// src/lib/queries/comics.ts
export function useComicsWithFilters(
  page: number = 1,
  itemsPerPage: number = 25,
  filters?: {
    tag?: string;
    search?: string;
    type?: string;
    status?: string;
    sort?: string;
  }
) {
  return useQuery({
    queryKey: comicKeys.list(
      JSON.stringify({ page, itemsPerPage, filters: filters || {} })
    ),
    queryFn: async (): Promise<ComicsResponse> => {
      const params = new URLSearchParams({
        page: page.toString(),
        itemsPerPage: itemsPerPage.toString(),
      });

      if (filters?.search) params.append("search", filters.search);
      if (filters?.tag) params.append("tag", filters.tag);
      // ... more filters

      const response = await fetch(`/api/comic-library?${params}`);
      if (!response.ok) throw new Error("Failed to fetch comics");

      const data = await response.json();
      return ComicsResponseSchema.parse(data); // Validate with Zod
    },
    staleTime: 1000 * 60 * 5,
  });
}
```

### Pattern 2: Mutation with Invalidation

```typescript
// src/lib/queries/comics.ts
export function useCreateComic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateComicData): Promise<Comic> => {
      const response = await fetch("/api/comic-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to create comic");
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all list queries
      queryClient.invalidateQueries({ queryKey: comicKeys.lists() });
    },
  });
}
```

### Pattern 3: Multiple Mutations

```typescript
// src/app/ebook-library/[ebook]/page.tsx
const createBookmarkMutation = useMutation({
  mutationFn: ({ bookmarkName, chapterTitle, cfi, positionPercentage }) =>
    createBookmark(ebookId, bookmarkName, chapterTitle, cfi, positionPercentage),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["ebook", ebookId] });
    setBookmarkDialogOpen(false);
    setBookmarkName("");
  },
});

const deleteBookmarkMutation = useMutation({
  mutationFn: (bookmarkId: number) => deleteBookmark(ebookId, bookmarkId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["ebook", ebookId] });
  },
});
```

---

## React Query DevTools

The project includes React Query DevTools in development mode:

```typescript
// Automatically included in QueryProvider
{process.env.NODE_ENV === "development" && (
  <ReactQueryDevtools initialIsOpen={false} />
)}
```

**Features:**
- View all queries and their states
- Inspect query data
- Manually refetch queries
- See query keys and cache structure
- Monitor query performance

**Access:** Click the React Query icon in the bottom corner of the browser (development only).

---

## Migration from useState/useEffect

### Before (useState)

```typescript
function EbookList() {
  const [ebooks, setEbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/ebook-library")
      .then((res) => res.json())
      .then((data) => {
        setEbooks(data.ebooks);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error</div>;

  return <div>{/* Render ebooks */}</div>;
}
```

### After (React Query)

```typescript
function EbookList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ebooks"],
    queryFn: async () => {
      const response = await fetch("/api/ebook-library");
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{data?.ebooks?.map(...)}</div>;
}
```

**Benefits:**
- Less code
- Automatic caching
- Background refetching
- Better error handling
- Shared cache across components

---

## Summary

React Query provides:

- ✅ **Automatic Caching**: Data is cached and shared
- ✅ **Loading States**: Built-in `isLoading`, `isFetching`, `isError`
- ✅ **Mutations**: Easy data updates with automatic invalidation
- ✅ **Query Keys**: Organized key structure for cache management
- ✅ **DevTools**: Visual debugging interface
- ✅ **TypeScript**: Full type safety

**Key Takeaways:**

1. Use `useQuery` for fetching data (GET)
2. Use `useMutation` for modifying data (POST, PUT, DELETE)
3. Organize query keys with factories
4. Invalidate queries after mutations
5. Create custom hooks for reusability
6. Set appropriate stale times
7. Use TypeScript for type safety

**Next Steps:**

- Review existing queries in `src/lib/queries/`
- Create new query hooks following the project patterns
- Use mutations for all data modifications
- Leverage DevTools for debugging

