import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tvShows } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const DeleteTvShowSchema = z.object({
  tv_show_id: z.coerce.number().int().positive(),
});

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tvShowId = searchParams.get("tv_show_id");

    if (!tvShowId) {
      return NextResponse.json(
        { error: "TV show ID is required" },
        { status: 400 }
      );
    }

    // Validate TV show ID
    const validatedData = DeleteTvShowSchema.parse({ tv_show_id: tvShowId });

    // Check if TV show exists
    const existingTvShow = await db
      .select()
      .from(tvShows)
      .where(eq(tvShows.tvShowId, validatedData.tv_show_id))
      .limit(1);

    if (existingTvShow.length === 0) {
      return NextResponse.json({ error: "TV show not found" }, { status: 404 });
    }

    // Delete the TV show (cascade will handle related episodes and video versions)
    await db
      .delete(tvShows)
      .where(eq(tvShows.tvShowId, validatedData.tv_show_id));

    return NextResponse.json(
      {
        message: "TV show deleted successfully",
        tv_show_id: validatedData.tv_show_id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting TV show:", error);

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
        error: "Failed to delete TV show",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
