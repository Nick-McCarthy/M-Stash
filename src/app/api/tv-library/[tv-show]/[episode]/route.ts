import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tvEpisodes, videoVersions } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ "tv-show": string; episode: string }> }
) {
  try {
    const { "tv-show": tvShowIdParam, episode: episodeIdParam } = await params;

    // Validate episode ID parameter
    const episodeId = z.coerce.number().int().positive().parse(episodeIdParam);

    // Get episode details
    const episodeResult = await db
      .select()
      .from(tvEpisodes)
      .where(eq(tvEpisodes.episodeId, episodeId))
      .limit(1);

    if (episodeResult.length === 0) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    const episodeData = episodeResult[0];

    // Fetch video versions (resolution variants: 480, 720, 1080, etc.) for debugging
    const videoVersionsResult = await db
      .select()
      .from(videoVersions)
      .where(eq(videoVersions.tvEpisodeId, episodeId))
      .orderBy(asc(videoVersions.resolution));

    // Format the episode data
    const formattedEpisode = {
      episode_id: episodeData.episodeId,
      tv_show_id: episodeData.tvShowId,
      season_number: episodeData.seasonNumber,
      episode_number: episodeData.episodeNumber,
      episode_title: episodeData.episodeTitle,
      thumbnail_address: episodeData.spriteAddress, // Using sprite as thumbnail fallback
      sprite_address: episodeData.spriteAddress,
      video_address: episodeData.masterPlaylistAddress,
      views: episodeData.views,
      updated_at: episodeData.updatedAt,
      available_resolutions: videoVersionsResult.map((v) => ({
        resolution: v.resolution,
        basePath: v.basePath,
        playlistPath: v.playlistPath,
        isDefault: v.isDefault,
      })),
    };

    return NextResponse.json(formattedEpisode);
  } catch (error) {
    console.error("Error fetching episode:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid episode ID",
          details: error.issues
            .map((e: any) => `${e.path.join(".")}: ${e.message}`)
            .join(", "),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to fetch episode",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

