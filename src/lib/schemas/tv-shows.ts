import { z } from "zod";

// ============================================================================
// Base Schemas
// ============================================================================

// Sort options for API queries
export const TvShowSortOptionSchema = z.enum([
  "az-asc",
  "za-desc",
  "date-updated",
  "views",
]);

// ============================================================================
// Episode Schemas
// ============================================================================

export const TvEpisodeSchema = z.object({
  episode_id: z.number().int().positive(),
  episode_number: z.number().int().positive(),
  episode_title: z.string().min(1, "Episode title is required"),
  master_playlist_address: z.string().min(1, "Master playlist address is required"),
  sprite_address: z.string().min(1, "Sprite address is required"),
  views: z.number().int().nonnegative(),
  updated_at: z
    .union([z.string(), z.date()])
    .transform((val) => (val instanceof Date ? val.toISOString() : val)),
});

export const TvSeasonSchema = z.object({
  season_number: z.number().int().positive(),
  episodes: z.array(TvEpisodeSchema),
});

// ============================================================================
// TV Show Schemas
// ============================================================================

// Matches the tv_shows table schema
export const TvShowSchema = z.object({
  // Database fields
  tv_show_id: z.number().int().positive(),
  title: z.string().min(1, "TV show title is required"),
  thumbnail_address: z.string().min(1, "Thumbnail address is required"),
  description: z.string().nullable(),
  tags: z.array(z.string()).default([]), // Array of strings
  genres: z.array(z.string()).default([]), // Array of strings
  views: z.number().int().nonnegative(),
  updated_at: z
    .union([z.string(), z.date()])
    .transform((val) => (val instanceof Date ? val.toISOString() : val)),
});

// TV Show with seasons (for detail view)
export const TvShowDetailSchema = TvShowSchema.extend({
  seasons: z.array(TvSeasonSchema),
});

// ============================================================================
// Filter & Pagination Schemas
// ============================================================================

export const TvShowFilterOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative(),
});

export const TvShowPaginationInfoSchema = z.object({
  currentPage: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  totalItems: z.number().int().nonnegative(),
  itemsPerPage: z.number().int().positive(),
});

export const TvShowsQueryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  itemsPerPage: z.coerce.number().int().positive().max(100).default(25),
  tag: z.string().nullish(), // Filter by tag
  genre: z.string().nullish(), // Filter by genre
  search: z.string().nullish(), // Search in title
  sort: z.preprocess(
    (val) => (val === null || val === undefined ? "az-asc" : val),
    TvShowSortOptionSchema
  ),
});

export const TvShowsResponseSchema = z.object({
  tv_shows: z.array(TvShowSchema),
  pagination: TvShowPaginationInfoSchema,
  tags: z.array(TvShowFilterOptionSchema),
});

// ============================================================================
// API Error Schema
// ============================================================================

export const TvShowApiErrorSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
});

// ============================================================================
// Type Exports (for TypeScript)
// ============================================================================

export type TvShowSortOption = z.infer<typeof TvShowSortOptionSchema>;
export type TvEpisode = z.infer<typeof TvEpisodeSchema>;
export type TvSeason = z.infer<typeof TvSeasonSchema>;
export type TvShow = z.infer<typeof TvShowSchema>;
export type TvShowDetail = z.infer<typeof TvShowDetailSchema>;
export type TvShowFilterOption = z.infer<typeof TvShowFilterOptionSchema>;
export type TvShowPaginationInfo = z.infer<typeof TvShowPaginationInfoSchema>;
export type TvShowsQueryParams = z.infer<typeof TvShowsQueryParamsSchema>;
export type TvShowsResponse = z.infer<typeof TvShowsResponseSchema>;
export type TvShowApiError = z.infer<typeof TvShowApiErrorSchema>;

