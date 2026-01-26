import { useQuery } from "@tanstack/react-query";
import {
  EbooksResponseSchema,
  EbookDetailSchema,
  type EbooksResponse,
  type EbookDetail,
} from "@/lib/schemas/ebooks";

// Query keys for consistent caching
export const ebookKeys = {
  all: ["ebooks"] as const,
  lists: () => [...ebookKeys.all, "list"] as const,
  list: (filters: string) => [...ebookKeys.lists(), { filters }] as const,
  detail: (id: number) => [...ebookKeys.all, "detail", id] as const,
};

export async function fetchEbooks(
  page: number,
  search: string
): Promise<EbooksResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    ...(search && { search }),
  });

  const response = await fetch(`/api/ebook-library?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch ebooks");
  }
  
  const data = await response.json();
  
  // Validate response with Zod schema
  const validationResult = EbooksResponseSchema.safeParse(data);
  
  if (!validationResult.success) {
    console.error(
      "Ebooks validation failed:",
      validationResult.error.issues
    );
    console.error("Received data:", data);
    throw new Error(
      `Validation failed: ${validationResult.error.issues[0]?.message}`
    );
  }
  
  return validationResult.data;
}

export function useEbook(id: number) {
  return useQuery({
    queryKey: ebookKeys.detail(id),
    queryFn: async (): Promise<EbookDetail | null> => {
      const response = await fetch(`/api/ebook-library/${id}`);

      if (!response.ok) {
        if (response.status === 404) return null;
        const errorData = await response.json();
        console.error("Ebook detail API error:", errorData);
        throw new Error("Failed to fetch ebook");
      }

      const data = await response.json();

      // Validate response with Zod schema
      const validationResult = EbookDetailSchema.safeParse(data);

      if (!validationResult.success) {
        console.error(
          "Ebook detail validation failed:",
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

