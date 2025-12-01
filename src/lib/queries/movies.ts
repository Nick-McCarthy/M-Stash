import { useQuery } from "@tanstack/react-query";
import {
  MoviesResponseSchema,
  type MoviesResponse,
} from "@/lib/schemas/movies";

// Query keys for consistent caching
export const movieKeys = {
  all: ["movies"] as const,
  lists: () => [...movieKeys.all, "list"] as const,
  list: (filters: string) => [...movieKeys.lists(), { filters }] as const,
};

// Re-export types from schemas
export type { MoviesResponse } from "@/lib/schemas/movies";

// Hooks
export function useMoviesWithFilters(
  page: number = 1,
  itemsPerPage: number = 25,
  filters?: {
    tag?: string;
    search?: string;
    sort?: string;
  }
) {
  return useQuery({
    queryKey: movieKeys.list(
      JSON.stringify({ page, itemsPerPage, filters: filters || {} })
    ),
    queryFn: async (): Promise<MoviesResponse> => {
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        itemsPerPage: itemsPerPage.toString(),
      });

      if (filters?.search && filters.search !== "")
        params.append("search", filters.search);
      if (filters?.tag && filters.tag !== "") params.append("tag", filters.tag);
      if (filters?.sort && filters.sort !== "")
        params.append("sort", filters.sort);

      const response = await fetch(`/api/movie-library?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error:", errorData);
        throw new Error("Failed to fetch movies");
      }

      const data = await response.json();

      // Validate response with Zod schema
      const validationResult = MoviesResponseSchema.safeParse(data);

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

      return validationResult.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
