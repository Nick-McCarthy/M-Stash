import { useQuery } from "@tanstack/react-query";
import {
  TvShowsResponseSchema,
  TvShowDetailSchema,
  type TvShowsResponse,
  type TvShowDetail,
} from "@/lib/schemas/tv-shows";

// Query keys for consistent caching
export const tvShowKeys = {
  all: ["tv-shows"] as const,
  lists: () => [...tvShowKeys.all, "list"] as const,
  list: (filters: string) => [...tvShowKeys.lists(), { filters }] as const,
  detail: (id: number) => [...tvShowKeys.all, "detail", id] as const,
};

// Hooks
export function useTvShowsWithFilters(
  page: number = 1,
  itemsPerPage: number = 25,
  filters?: {
    tag?: string;
    genre?: string;
    search?: string;
    sort?: string;
  }
) {
  return useQuery({
    queryKey: tvShowKeys.list(
      JSON.stringify({ page, itemsPerPage, filters: filters || {} })
    ),
    queryFn: async (): Promise<TvShowsResponse> => {
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        itemsPerPage: itemsPerPage.toString(),
      });

      if (filters?.search && filters.search !== "")
        params.append("search", filters.search);
      if (filters?.tag && filters.tag !== "") params.append("tag", filters.tag);
      if (filters?.genre && filters.genre !== "") params.append("genre", filters.genre);
      if (filters?.sort && filters.sort !== "")
        params.append("sort", filters.sort);

      const response = await fetch(`/api/tv-library?${params.toString()}`);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = {
            error: `HTTP ${response.status}`,
            details: response.statusText || "Unknown error",
          };
        }
        console.error("API error:", errorData);
        const errorMessage =
          errorData?.error || errorData?.details || `Failed to fetch TV shows (${response.status})`;
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Validate response with Zod schema
      const validationResult = TvShowsResponseSchema.safeParse(data);

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

export function useTvShow(id: number) {
  return useQuery({
    queryKey: tvShowKeys.detail(id),
    queryFn: async (): Promise<TvShowDetail | null> => {
      const response = await fetch(`/api/tv-library/${id}`);

      if (!response.ok) {
        if (response.status === 404) return null;
        const errorData = await response.json();
        console.error("TV show detail API error:", errorData);
        throw new Error("Failed to fetch TV show");
      }

      const data = await response.json();

      // Validate response with Zod schema
      const validationResult = TvShowDetailSchema.safeParse(data);

      if (!validationResult.success) {
        console.error(
          "TV show detail validation failed:",
          validationResult.error.issues
        );
        console.error("Received data:", data);
        throw new Error(
          `Validation failed: ${validationResult.error.issues[0]?.message}`
        );
      }

      return validationResult.data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

