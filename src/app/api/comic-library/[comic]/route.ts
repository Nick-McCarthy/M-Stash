import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comics, comicChapters, chapterImages } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { ComicSchema, ApiErrorSchema } from "@/lib/schemas/comics";
import { ZodError } from "zod";
import { z } from "zod";
import { parseJsonArray } from "@/lib/db/sqlite-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ comic: string }> }
) {
  try {
    const { comic } = await params;

    // Validate comic ID parameter
    const comicId = z.coerce.number().int().positive().parse(comic);

    // Get comic details
    const comicResult = await db
      .select()
      .from(comics)
      .where(eq(comics.comicId, comicId))
      .limit(1);

    if (comicResult.length === 0) {
      return NextResponse.json({ error: "Comic not found" }, { status: 404 });
    }

    const comicData = comicResult[0];

    // Get unique chapters for this comic (grouped by chapter_number)
    const chaptersResult = await db
      .select({
        chapterId: comicChapters.chapterId,
        chapterNumber: comicChapters.chapterNumber,
        favorite: comicChapters.favorite,
        imageCount: sql<number>`COUNT(${chapterImages.imageId})`,
        firstImagePath: sql<string>`MIN(${chapterImages.imagePath})`,
      })
      .from(comicChapters)
      .leftJoin(
        chapterImages,
        eq(comicChapters.chapterId, chapterImages.chapterId)
      )
      .where(eq(comicChapters.comicId, comicId))
      .groupBy(
        comicChapters.chapterId,
        comicChapters.chapterNumber,
        comicChapters.favorite
      )
      .orderBy(desc(comicChapters.chapterNumber));

    const chapters = chaptersResult.map((row) => ({
      chapter_id: row.chapterId,
      chapter_number: parseFloat(row.chapterNumber.toString()), // Convert DECIMAL to number
      image_count: parseInt(row.imageCount.toString()), // Convert string to number
      first_image_path: row.firstImagePath,
      favorite: row.favorite,
    }));

    // Format the comic data with proper field names
    const formattedComic = {
      comic_id: comicData.comicId,
      comic_title: comicData.comicTitle,
      thumbnail_address: comicData.thumbnailAddress,
      comic_description: comicData.comicDescription,
      number_of_chapters: comicData.numberOfChapters,
      comic_type: comicData.comicType,
      tags: parseJsonArray(comicData.tags as string),
      views: comicData.views,
      updated_at: comicData.updatedAt,
      status: comicData.status,
      chapters,
      recentChapters: [], // Computed field required by schema
    };

    // Validate response data with detailed error logging
    const validationResult = ComicSchema.safeParse(formattedComic);

    if (!validationResult.success) {
      console.error(
        "Comic detail validation failed:",
        JSON.stringify(validationResult.error.issues, null, 2)
      );
      console.error("Comic data:", JSON.stringify(formattedComic, null, 2));

      return NextResponse.json(
        {
          error: "Response validation failed",
          details: validationResult.error.issues,
          sampleData: formattedComic,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(validationResult.data);
  } catch (error) {
    console.error("Error fetching comic:", error);

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const errorResponse = ApiErrorSchema.parse({
        error: "Invalid comic ID or data",
        details: error.issues
          .map((e: any) => `${e.path.join(".")}: ${e.message}`)
          .join(", "),
      });
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const errorResponse = ApiErrorSchema.parse({
      error: "Failed to fetch comic",
      details: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
