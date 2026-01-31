import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tvShows, tvEpisodes } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import { parseJsonArray } from "@/lib/db/sqlite-helpers";
import {
  TvShowDetailSchema,
  TvShowApiErrorSchema,
} from "@/lib/schemas/tv-shows";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ "tv-show": string }> }
) {
  try {
    const { "tv-show": tvShowIdParam } = await params;

    // Validate TV show ID parameter
    const tvShowId = z.coerce.number().int().positive().parse(tvShowIdParam);

    // Get TV show details
    const tvShowResult = await db
      .select()
      .from(tvShows)
      .where(eq(tvShows.tvShowId, tvShowId))
      .limit(1);

    if (tvShowResult.length === 0) {
      return NextResponse.json({ error: "TV show not found" }, { status: 404 });
    }

    const tvShowData = tvShowResult[0];

    // Get all episodes for this TV show, grouped by season
    const episodesResult = await db
      .select()
      .from(tvEpisodes)
      .where(eq(tvEpisodes.tvShowId, tvShowId))
      .orderBy(asc(tvEpisodes.seasonNumber), asc(tvEpisodes.episodeNumber));

    // Group episodes by season
    const seasons: Record<number, typeof episodesResult> = {};
    episodesResult.forEach((episode) => {
      if (!seasons[episode.seasonNumber]) {
        seasons[episode.seasonNumber] = [];
      }
      seasons[episode.seasonNumber].push(episode);
    });

    // Format episodes
    const formattedSeasons = Object.entries(seasons).map(([seasonNum, episodes]) => ({
      season_number: parseInt(seasonNum),
      episodes: episodes.map((ep) => ({
        episode_id: ep.episodeId,
        episode_number: ep.episodeNumber,
        episode_title: ep.episodeTitle,
        master_playlist_address: ep.masterPlaylistAddress,
        sprite_address: ep.spriteAddress,
        views: ep.views,
        updated_at: ep.updatedAt,
      })),
    }));

    // Format the TV show data
    // Handle case where genres column might not exist in older databases
    const genresValue = (tvShowData as any).genres;
    const formattedTvShow = {
      tv_show_id: tvShowData.tvShowId,
      title: tvShowData.title,
      thumbnail_address: tvShowData.thumbnailAddress,
      description: tvShowData.description,
      tags: parseJsonArray(tvShowData.tags as string),
      genres: parseJsonArray(genresValue || "[]"),
      views: tvShowData.views,
      updated_at: tvShowData.updatedAt,
      seasons: formattedSeasons,
    };

    // Validate response with Zod schema
    const validationResult = TvShowDetailSchema.safeParse(formattedTvShow);

    if (!validationResult.success) {
      console.error(
        "Response validation failed:",
        JSON.stringify(validationResult.error.issues, null, 2)
      );
      return NextResponse.json(
        {
          error: "Response validation failed",
          details: validationResult.error.issues,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(validationResult.data);
  } catch (error) {
    console.error("Error fetching TV show:", error);

    if (error instanceof z.ZodError) {
      const errorResponse = TvShowApiErrorSchema.parse({
        error: "Invalid TV show ID",
        details: error.issues
          .map((e: any) => `${e.path.join(".")}: ${e.message}`)
          .join(", "),
      });
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const errorResponse = TvShowApiErrorSchema.parse({
      error: "Failed to fetch TV show",
      details: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

