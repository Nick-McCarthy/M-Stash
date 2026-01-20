import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

// TV Shows Response Schema
const TvShowsResponseSchema = z.object({
  tv_shows: z.array(
    z.object({
      tv_show_id: z.number(),
      title: z.string(),
      thumbnail_address: z.string(),
      description: z.string().nullable(),
      tags: z.array(z.string()),
      views: z.number(),
      updated_at: z.union([z.string(), z.date()]),
    })
  ),
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    totalItems: z.number(),
    itemsPerPage: z.number(),
  }),
  tags: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      count: z.number(),
    })
  ),
});

export type TvShowsResponse = z.infer<typeof TvShowsResponseSchema>;

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

