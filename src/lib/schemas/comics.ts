import { z } from "zod";

// ============================================================================
// Base Schemas
// ============================================================================

// Matches the comic_type ENUM in database schema
export const ComicTypeSchema = z.enum(["manga", "webtoon", "western"]);

// Matches the comic_status ENUM in database schema
export const ComicStatusSchema = z.enum([
  "ongoing",
  "completed",
  "hiatus",
  "cancelled",
]);

// Sort options for API queries
export const SortOptionSchema = z.enum([
  "az-asc",
  "za-desc",
  "date-updated",
  "views",
]);

// ============================================================================
// Chapter Schemas
// ============================================================================

export const ComicChapterSchema = z.object({
  chapter_id: z.number().int().positive(),
  chapter_number: z.coerce.number().positive(), // Coerce from string (DECIMAL in DB)
  image_count: z.number().int().nonnegative(),
  first_image_path: z.string().nullable(), // Can be null if no images
  favorite: z.boolean(),
});

export const RecentChapterSchema = z.object({
  number: z.string(),
  title: z.string().optional(),
});

export const ChapterImageSchema = z.object({
  chapter_id: z.number().int().positive(),
  image_ordering: z.number().int().nonnegative(),
  image_path: z.string().min(1, "Image path is required"),
});

// ============================================================================
// Comic Schemas
// ============================================================================

// Matches the comics table schema exactly
export const ComicSchema = z.object({
  // Database fields
  comic_id: z.number().int().positive(),
  comic_title: z.string().min(1, "Comic title is required"),
  thumbnail_address: z.string().min(1, "Thumbnail address is required"),
  comic_description: z.string().nullable(), // VARCHAR(2000), can be null
  number_of_chapters: z.number().int().nonnegative(),
  comic_type: ComicTypeSchema, // ENUM: manga, webtoon, western
  tags: z.array(z.string()), // JSONB array
  views: z.number().int().nonnegative(),
  updated_at: z
    .union([z.string(), z.date()])
    .transform((val) => (val instanceof Date ? val.toISOString() : val)), // TIMESTAMP WITH TIME ZONE
  status: ComicStatusSchema, // ENUM: ongoing, completed, hiatus, cancelled

  // Computed/API-only fields (not in database)
  chapters: z.array(ComicChapterSchema).optional(), // Joined data for detail view
  recentChapters: z.array(RecentChapterSchema), // Computed from comic_chapters
});

export const CreateComicDataSchema = z.object({
  comic_title: z.string().min(1, "Comic title is required"),
  thumbnail_address: z.string().min(1, "Thumbnail address is required"),
  comic_description: z.string().optional(),
  comic_type: ComicTypeSchema,
  tags: z.array(z.string()).optional(),
});

export const UpdateComicDataSchema = CreateComicDataSchema.partial();

// ============================================================================
// Filter & Pagination Schemas
// ============================================================================

export const FilterOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative(),
});

export const PaginationInfoSchema = z.object({
  currentPage: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  totalItems: z.number().int().nonnegative(),
  itemsPerPage: z.number().int().positive(),
});

export const ComicsQueryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  itemsPerPage: z.coerce.number().int().positive().max(100).default(25),
  tag: z.string().nullish(), // Filter by tag
  search: z.string().nullish(), // Search in comic_title
  type: ComicTypeSchema.or(z.literal("all")).nullish(), // Filter by comic_type
  status: ComicStatusSchema.or(z.literal("all")).nullish(), // Filter by status
  sort: SortOptionSchema.default("az-asc"),
});

export const ComicsResponseSchema = z.object({
  comics: z.array(ComicSchema),
  pagination: PaginationInfoSchema,
  tags: z.array(FilterOptionSchema),
});

// ============================================================================
// Chapter Detail Schemas
// ============================================================================

export const ChapterDataSchema = z.object({
  comic: z.object({
    comic_id: z.number().int().positive(),
    comic_title: z.string().min(1),
  }),
  chapter: z.object({
    chapter_number: z.coerce.number().positive(), // Coerce from string (DECIMAL in DB)
    image_count: z.number().int().nonnegative(),
    favorite: z.boolean(),
    prev_chapter: z.coerce.number().positive().nullable(), // Coerce from string (DECIMAL in DB)
    next_chapter: z.coerce.number().positive().nullable(), // Coerce from string (DECIMAL in DB)
  }),
  images: z.array(ChapterImageSchema),
});

// ============================================================================
// Favorite Toggle Schemas
// ============================================================================

export const ToggleFavoriteRequestSchema = z.object({
  favorite: z.boolean(),
});

export const ToggleFavoriteResponseSchema = z.object({
  chapter_id: z.number().int().positive(),
  favorite: z.boolean(),
});

// ============================================================================
// View Tracking Schemas
// ============================================================================

export const IncrementComicViewResponseSchema = z.object({
  comic_id: z.number().int().positive(),
  views: z.number().int().nonnegative(),
});

// ============================================================================
// API Error Schema
// ============================================================================

export const ApiErrorSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
});

// ============================================================================
// Type Exports (for TypeScript)
// ============================================================================

export type ComicType = z.infer<typeof ComicTypeSchema>;
export type ComicStatus = z.infer<typeof ComicStatusSchema>;
export type SortOption = z.infer<typeof SortOptionSchema>;
export type ComicChapter = z.infer<typeof ComicChapterSchema>;
export type RecentChapter = z.infer<typeof RecentChapterSchema>;
export type ChapterImage = z.infer<typeof ChapterImageSchema>;
export type Comic = z.infer<typeof ComicSchema>;
export type CreateComicData = z.infer<typeof CreateComicDataSchema>;
export type UpdateComicData = z.infer<typeof UpdateComicDataSchema>;
export type FilterOption = z.infer<typeof FilterOptionSchema>;
export type PaginationInfo = z.infer<typeof PaginationInfoSchema>;
export type ComicsQueryParams = z.infer<typeof ComicsQueryParamsSchema>;
export type ComicsResponse = z.infer<typeof ComicsResponseSchema>;
export type ChapterData = z.infer<typeof ChapterDataSchema>;
export type ToggleFavoriteRequest = z.infer<typeof ToggleFavoriteRequestSchema>;
export type ToggleFavoriteResponse = z.infer<
  typeof ToggleFavoriteResponseSchema
>;
export type IncrementComicViewResponse = z.infer<
  typeof IncrementComicViewResponseSchema
>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
