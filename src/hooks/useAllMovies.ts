import { useState, useEffect } from "react";

export function useAllMovies() {
  const [allMovies, setAllMovies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAllMovies = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let page = 1;
        let allMoviesData: any[] = [];
        let hasMore = true;

        while (hasMore) {
          const response = await fetch(
            `/api/movie-library?page=${page}&itemsPerPage=100&sort=az-asc`
          );

          if (!response.ok) {
            throw new Error(`Failed to fetch movies: ${response.status}`);
          }

          const data = await response.json();
          allMoviesData = [...allMoviesData, ...data.movies];

          // Check if we've reached the last page
          hasMore = page < data.pagination.totalPages;
          page++;
        }

        setAllMovies(allMoviesData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllMovies();
  }, []);

  return { movies: allMovies, isLoading, error };
}
