import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ComicsResponseSchema,
  ComicSchema,
  ChapterDataSchema,
  ToggleFavoriteResponseSchema,
  type Comic,
  type ComicsResponse,
  type ChapterData,
  type CreateComicData,
  type UpdateComicData,
  type ToggleFavoriteResponse,
} from "@/lib/schemas/comics";

// Query keys for consistent caching
export const comicKeys = {
  all: ["comics"] as const,
  lists: () => [...comicKeys.all, "list"] as const,
  list: (filters: string) => [...comicKeys.lists(), { filters }] as const,
  details: () => [...comicKeys.all, "detail"] as const,
  detail: (id: number) => [...comicKeys.details(), id] as const,
  tags: () => [...comicKeys.all, "tags"] as const,
};

// Re-export types from schemas for backwards compatibility
export type {
  Comic,
  ComicsResponse,
  ChapterData,
  CreateComicData,
  UpdateComicData,
  ToggleFavoriteResponse,
} from "@/lib/schemas/comics";

// Hooks
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
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        itemsPerPage: itemsPerPage.toString(),
      });

      if (filters?.search && filters.search !== "")
        params.append("search", filters.search);
      if (filters?.tag && filters.tag !== "") params.append("tag", filters.tag);
      if (filters?.type && filters.type !== "")
        params.append("type", filters.type);
      if (filters?.status && filters.status !== "")
        params.append("status", filters.status);
      if (filters?.sort && filters.sort !== "")
        params.append("sort", filters.sort);

      const response = await fetch(`/api/comic-library?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error:", errorData);
        throw new Error("Failed to fetch comics");
      }

      const data = await response.json();

      // Validate response with Zod schema - use safeParse for better error info
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

      return validationResult.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useComic(id: number) {
  return useQuery({
    queryKey: comicKeys.detail(id),
    queryFn: async (): Promise<Comic | null> => {
      const response = await fetch(`/api/comic-library/${id}`);

      if (!response.ok) {
        if (response.status === 404) return null;
        const errorData = await response.json();
        console.error("Comic detail API error:", errorData);
        throw new Error("Failed to fetch comic");
      }

      const data = await response.json();

      // Validate response with Zod schema - use safeParse for better error info
      const validationResult = ComicSchema.safeParse(data);

      if (!validationResult.success) {
        console.error(
          "Comic detail validation failed:",
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

export function useChapter(comicId: number, chapterNumber: number) {
  return useQuery({
    queryKey: ["chapter", comicId, chapterNumber],
    queryFn: async (): Promise<ChapterData> => {
      const response = await fetch(
        `/api/comic-library/${comicId}/${chapterNumber}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Chapter not found");
        }
        throw new Error("Failed to fetch chapter");
      }

      const data = await response.json();

      // Validate response with Zod schema
      return ChapterDataSchema.parse(data);
    },
    enabled: !!comicId && !!chapterNumber,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

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

export function useUpdateComic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<CreateComicData>;
    }): Promise<Comic> => {
      const response = await fetch(`/api/comic-library/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update comic");
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate and refetch comics list and specific comic
      queryClient.invalidateQueries({ queryKey: comicKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: comicKeys.detail(data.comic_id),
      });
    },
  });
}

export function useDeleteComic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const response = await fetch(`/api/comic-library/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete comic");
      }
    },
    onSuccess: () => {
      // Invalidate and refetch comics list
      queryClient.invalidateQueries({ queryKey: comicKeys.lists() });
    },
  });
}

export function useToggleChapterFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      comicId,
      chapterNumber,
      favorite,
    }: {
      comicId: number;
      chapterNumber: number;
      favorite: boolean;
    }): Promise<ToggleFavoriteResponse> => {
      const response = await fetch(
        `/api/comic-library/${comicId}/${chapterNumber}/favorite`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ favorite }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update favorite status");
      }

      const data = await response.json();

      // Validate response with Zod schema
      return ToggleFavoriteResponseSchema.parse(data);
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch the specific chapter
      queryClient.invalidateQueries({
        queryKey: ["chapter", variables.comicId, variables.chapterNumber],
      });
    },
  });
}
