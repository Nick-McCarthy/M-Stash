import { useState, useEffect } from "react";

export function useAllComics() {
  const [allComics, setAllComics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAllComics = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let page = 1;
        let allComicsData: any[] = [];
        let hasMore = true;

        while (hasMore) {
          const response = await fetch(
            `/api/comic-library?page=${page}&itemsPerPage=100&sort=az-asc`
          );

          if (!response.ok) {
            throw new Error(`Failed to fetch comics: ${response.status}`);
          }

          const data = await response.json();
          allComicsData = [...allComicsData, ...data.comics];

          // Check if we've reached the last page
          hasMore = page < data.pagination.totalPages;
          page++;
        }

        setAllComics(allComicsData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllComics();
  }, []);

  return { comics: allComics, isLoading, error };
}
