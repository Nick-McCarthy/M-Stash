import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comicChapters } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

const DeleteChaptersSchema = z.object({
  chapter_ids: z.array(z.coerce.number().int().positive()),
});

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = DeleteChaptersSchema.parse(body);

    if (validatedData.chapter_ids.length === 0) {
      return NextResponse.json(
        { error: "At least one chapter ID is required" },
        { status: 400 }
      );
    }

    // Check if chapters exist
    const existingChapters = await db
      .select({
        chapterId: comicChapters.chapterId,
      })
      .from(comicChapters)
      .where(inArray(comicChapters.chapterId, validatedData.chapter_ids));

    if (existingChapters.length === 0) {
      return NextResponse.json(
        { error: "No chapters found with the provided IDs" },
        { status: 404 }
      );
    }

    // Delete the chapters (cascade will handle related chapter_images)
    await db
      .delete(comicChapters)
      .where(inArray(comicChapters.chapterId, validatedData.chapter_ids));

    return NextResponse.json(
      {
        message: "Chapters deleted successfully",
        deleted_count: existingChapters.length,
        chapter_ids: existingChapters.map((c) => c.chapterId),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting chapters:", error);

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
        error: "Failed to delete chapters",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

