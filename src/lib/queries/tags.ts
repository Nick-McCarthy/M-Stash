import { useQuery } from "@tanstack/react-query";

export interface Tag {
  tag_name: string;
}

export interface TagsResponse {
  tags: string[];
}

const fetchTags = async (): Promise<string[]> => {
  const response = await fetch("/api/tags");
  if (!response.ok) {
    throw new Error("Failed to fetch tags");
  }
  const data: TagsResponse = await response.json();
  return data.tags;
};

export const useTags = () => {
  return useQuery({
    queryKey: ["tags"],
    queryFn: fetchTags,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
