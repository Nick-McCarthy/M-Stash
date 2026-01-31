import { useQuery } from "@tanstack/react-query";

export interface GenresResponse {
  genres: string[];
}

const fetchGenres = async (): Promise<string[]> => {
  const response = await fetch("/api/genres");
  if (!response.ok) {
    throw new Error("Failed to fetch genres");
  }
  const data: GenresResponse = await response.json();
  return data.genres;
};

export const useGenres = () => {
  return useQuery({
    queryKey: ["genres"],
    queryFn: fetchGenres,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

