import type { EbooksResponse } from "@/components/ebook-library/types";

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
  return response.json();
}

