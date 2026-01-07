import { z } from "zod";

// ============================================================================
// Base Schemas
// ============================================================================

// Sort options for API queries
export const MovieSortOptionSchema = z.enum([
  "az-asc",
  "za-desc",
  "date-updated",
  "views",
]);

// ============================================================================
// Movie Schemas
// ============================================================================

// Matches the movies table schema
export const MovieSchema = z.object({
  // Database fields
  movie_id: z.number().int().positive(),
  title: z.string().min(1, "Movie title is required"),
  thumbnail_address: z.string().min(1, "Thumbnail address is required"),
  sprite_address: z.string().min(1, "Sprite address is required"),
  video_address: z.string().min(1, "Video address is required"),
  tags: z.array(z.string()).default([]), // Array of strings
  views: z.number().int().nonnegative(),
  updated_at: z
    .union([z.string(), z.date()])
    .transform((val) => (val instanceof Date ? val.toISOString() : val)), // TIMESTAMP WITH TIME ZONE
});

// ============================================================================
// Filter & Pagination Schemas
// ============================================================================

export const MovieFilterOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative(),
});

export const MoviePaginationInfoSchema = z.object({
  currentPage: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  totalItems: z.number().int().nonnegative(),
  itemsPerPage: z.number().int().positive(),
});

export const MoviesQueryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  itemsPerPage: z.coerce.number().int().positive().max(100).default(25),
  tag: z.string().nullish(), // Filter by tag
  search: z.string().nullish(), // Search in title
  sort: z.preprocess(
    (val) => (val === null || val === undefined ? "az-asc" : val),
    MovieSortOptionSchema
  ),
});

export const MoviesResponseSchema = z.object({
  movies: z.array(MovieSchema),
  pagination: MoviePaginationInfoSchema,
  tags: z.array(MovieFilterOptionSchema),
});

// ============================================================================
// API Error Schema
// ============================================================================

export const MovieApiErrorSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
});

// ============================================================================
// Type Exports (for TypeScript)
// ============================================================================

export type MovieSortOption = z.infer<typeof MovieSortOptionSchema>;
export type Movie = z.infer<typeof MovieSchema>;
export type MovieFilterOption = z.infer<typeof MovieFilterOptionSchema>;
export type MoviePaginationInfo = z.infer<typeof MoviePaginationInfoSchema>;
export type MoviesQueryParams = z.infer<typeof MoviesQueryParamsSchema>;
export type MoviesResponse = z.infer<typeof MoviesResponseSchema>;
export type MovieApiError = z.infer<typeof MovieApiErrorSchema>;
