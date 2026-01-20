import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tvEpisodes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const DeleteEpisodeSchema = z.object({
  episode_id: z.coerce.number().int().positive(),
});

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get("episode_id");

    if (!episodeId) {
      return NextResponse.json(
        { error: "Episode ID is required" },
        { status: 400 }
      );
    }

    // Validate episode ID
    const validatedData = DeleteEpisodeSchema.parse({ episode_id: episodeId });

    // Check if episode exists
    const existingEpisode = await db
      .select()
      .from(tvEpisodes)
      .where(eq(tvEpisodes.episodeId, validatedData.episode_id))
      .limit(1);

    if (existingEpisode.length === 0) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    // Delete the episode (cascade will handle related video versions)
    await db
      .delete(tvEpisodes)
      .where(eq(tvEpisodes.episodeId, validatedData.episode_id));

    return NextResponse.json(
      {
        message: "Episode deleted successfully",
        episode_id: validatedData.episode_id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting episode:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join(", "),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to delete episode",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
