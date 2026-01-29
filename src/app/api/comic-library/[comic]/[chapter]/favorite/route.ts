import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comicChapters } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  ToggleFavoriteRequestSchema,
  ToggleFavoriteResponseSchema,
  ApiErrorSchema,
} from "@/lib/schemas/comics";
import { ZodError } from "zod";
import { z } from "zod";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ comic: string; chapter: string }> }
) {
  try {
    const { comic, chapter } = await params;

    // Validate parameters
    const comicId = z.coerce.number().int().positive().parse(comic);
    const chapterNumber = z.coerce.number().positive().parse(chapter);

    // Validate request body
    const body = await request.json();
    const { favorite } = ToggleFavoriteRequestSchema.parse(body);

    // Update the favorite status for this chapter
    const result = await db
      .update(comicChapters)
      .set({ favorite })
      .where(
        and(
          eq(comicChapters.comicId, comicId),
          eq(comicChapters.chapterNumber, chapterNumber)
        )
      )
      .returning({
        chapterId: comicChapters.chapterId,
        favorite: comicChapters.favorite,
      });

    if (result.length === 0) {
      const errorResponse = ApiErrorSchema.parse({
        error: "Chapter not found",
      });
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Validate response data
    const validatedResponse = ToggleFavoriteResponseSchema.parse({
      chapter_id: result[0].chapterId,
      favorite: result[0].favorite,
    });

    return NextResponse.json(validatedResponse);
  } catch (error) {
    console.error("Error updating chapter favorite status:", error);

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const errorResponse = ApiErrorSchema.parse({
        error: "Invalid request data",
        details: error.issues
          .map((e: any) => `${e.path.join(".")}: ${e.message}`)
          .join(", "),
      });
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const errorResponse = ApiErrorSchema.parse({
      error: "Failed to update favorite status",
      details: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
