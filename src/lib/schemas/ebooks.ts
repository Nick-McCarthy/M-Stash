import { z } from "zod";

// ============================================================================
// Bookmark Schemas
// ============================================================================

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

// ============================================================================
// Ebook Schemas
// ============================================================================

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

// ============================================================================
// Pagination Schemas
// ============================================================================

export const EbookPaginationInfoSchema = z.object({
  currentPage: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  totalItems: z.number().int().nonnegative(),
  itemsPerPage: z.number().int().positive(),
});

export const EbooksQueryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  search: z.string().nullish(), // Search in title or author
});

export const EbooksResponseSchema = z.object({
  ebooks: z.array(EbookSchema),
  pagination: EbookPaginationInfoSchema,
});

// ============================================================================
// Bookmark Management Schemas
// ============================================================================

export const CreateBookmarkSchema = z.object({
  bookmark_name: z.string().min(1, "Bookmark name is required"),
  chapter_title: z.string().nullable().optional(),
  cfi: z.string().min(1, "CFI is required"),
  position_percentage: z.number().min(0).max(100).nullable().optional(),
});

export const CreateBookmarkResponseSchema = EbookBookmarkSchema;

// ============================================================================
// API Error Schema
// ============================================================================

export const EbookApiErrorSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
});

// ============================================================================
// Type Exports (for TypeScript)
// ============================================================================

export type EbookBookmark = z.infer<typeof EbookBookmarkSchema>;
export type Ebook = z.infer<typeof EbookSchema>;
export type EbookDetail = z.infer<typeof EbookDetailSchema>;
export type EbookPaginationInfo = z.infer<typeof EbookPaginationInfoSchema>;
export type EbooksQueryParams = z.infer<typeof EbooksQueryParamsSchema>;
export type EbooksResponse = z.infer<typeof EbooksResponseSchema>;
export type CreateBookmark = z.infer<typeof CreateBookmarkSchema>;
export type CreateBookmarkResponse = z.infer<typeof CreateBookmarkResponseSchema>;
export type EbookApiError = z.infer<typeof EbookApiErrorSchema>;

