"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { z } from "zod";
import {
  TvShowHeader,
  TvShowInfo,
  TvShowSeasonsAccordion,
  TvShowSkeleton,
  TvShowError,
} from "@/components/tv-library/tv-show";

interface TvShow {
  tv_show_id: number;
  title: string;
  thumbnail_address: string;
  description: string | null;
  tags: string[];
  views: number;
  updated_at: string;
  seasons: {
    season_number: number;
    episodes: {
      episode_id: number;
      episode_number: number;
      episode_title: string;
      views: number;
      updated_at: string;
    }[];
  }[];
}

async function fetchTvShow(id: number): Promise<TvShow> {
  const response = await fetch(`/api/tv-library/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch TV show");
  }
  const data = await response.json();
  return data;
}

export default function TvShowPage() {
  const params = useParams();
  const [tvShow, setTvShow] = useState<TvShow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTvShow = async () => {
      try {
        setLoading(true);
        setError(null);
        const tvShowId = z.coerce
          .number()
          .int()
          .positive()
          .parse(params["tv-show"]);
        const tvShowData = await fetchTvShow(tvShowId);
        setTvShow(tvShowData);
      } catch (err) {
        console.error("Error loading TV show:", err);
        setError(err instanceof Error ? err.message : "Failed to load TV show");
      } finally {
        setLoading(false);
      }
    };

    if (params["tv-show"]) {
      loadTvShow();
    }
  }, [params["tv-show"]]);

  if (loading) {
    return <TvShowSkeleton />;
  }

  if (error || !tvShow) {
    return <TvShowError error={error} />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <TvShowHeader />
      <TvShowInfo
        thumbnailAddress={tvShow.thumbnail_address}
        title={tvShow.title}
        description={tvShow.description}
        views={tvShow.views}
        updatedAt={tvShow.updated_at}
        tags={tvShow.tags}
      />
      <TvShowSeasonsAccordion
        seasons={tvShow.seasons}
        tvShowId={tvShow.tv_show_id}
      />
    </div>
  );
}
