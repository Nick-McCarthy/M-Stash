import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comics, comicChapters, chapterImages } from "@/lib/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";
import { ChapterDataSchema, ApiErrorSchema } from "@/lib/schemas/comics";
import { ZodError } from "zod";
import { z } from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ comic: string; chapter: string }> }
) {
  try {
    const { comic, chapter } = await params;

    // Validate parameters
    const comicId = z.coerce.number().int().positive().parse(comic);
    const chapterNumber = z.coerce.number().positive().parse(chapter);

    // Get comic details
    const comicResult = await db
      .select({
        comicId: comics.comicId,
        comicTitle: comics.comicTitle,
      })
      .from(comics)
      .where(eq(comics.comicId, comicId))
      .limit(1);

    if (comicResult.length === 0) {
      return NextResponse.json({ error: "Comic not found" }, { status: 404 });
    }

    const comicData = comicResult[0];

    // Get all images for this specific chapter
    const imagesResult = await db
      .select({
        chapterId: chapterImages.chapterId,
        imageOrdering: chapterImages.imageOrdering,
        imagePath: chapterImages.imagePath,
      })
      .from(chapterImages)
      .innerJoin(
        comicChapters,
        eq(chapterImages.chapterId, comicChapters.chapterId)
      )
      .where(
        and(
          eq(comicChapters.comicId, comicId),
          eq(comicChapters.chapterNumber, chapterNumber)
        )
      )
      .orderBy(asc(chapterImages.imageOrdering));

    // Get chapter details including favorite status
    const chapterDetailsResult = await db
      .select({
        chapterId: comicChapters.chapterId,
        chapterNumber: comicChapters.chapterNumber,
        favorite: comicChapters.favorite,
      })
      .from(comicChapters)
      .where(
        and(
          eq(comicChapters.comicId, comicId),
          eq(comicChapters.chapterNumber, chapterNumber)
        )
      )
      .limit(1);

    if (imagesResult.length === 0 || chapterDetailsResult.length === 0) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    const chapterDetails = chapterDetailsResult[0];

    // Get previous and next chapter numbers using window functions
    const prevNextResult = await db
      .select({
        chapterNumber: comicChapters.chapterNumber,
        prevChapter: sql<string>`LAG(${comicChapters.chapterNumber}) OVER (ORDER BY ${comicChapters.chapterNumber})`,
        nextChapter: sql<string>`LEAD(${comicChapters.chapterNumber}) OVER (ORDER BY ${comicChapters.chapterNumber})`,
      })
      .from(comicChapters)
      .where(eq(comicChapters.comicId, comicId))
      .orderBy(asc(comicChapters.chapterNumber));

    const currentChapterRow = prevNextResult.find(
      (row) => parseFloat(row.chapterNumber.toString()) === chapterNumber
    );

    console.log("All chapters for comic:", prevNextResult);
    console.log("Current chapter row:", currentChapterRow);
    console.log("Looking for chapter number:", chapterNumber);

    const images = imagesResult.map((row) => ({
      chapter_id: row.chapterId,
      image_ordering: row.imageOrdering,
      image_path: row.imagePath,
    }));

    const response = {
      comic: {
        comic_id: comicData.comicId,
        comic_title: comicData.comicTitle,
      },
      chapter: {
        chapter_number: chapterNumber,
        image_count: images.length,
        favorite: chapterDetails.favorite,
        prev_chapter: currentChapterRow?.prevChapter
          ? parseFloat(currentChapterRow.prevChapter)
          : null,
        next_chapter: currentChapterRow?.nextChapter
          ? parseFloat(currentChapterRow.nextChapter)
          : null,
      },
      images,
    };

    // Validate response data with detailed error logging
    const validationResult = ChapterDataSchema.safeParse(response);

    if (!validationResult.success) {
      console.error(
        "Chapter validation failed:",
        JSON.stringify(validationResult.error.issues, null, 2)
      );
      console.error("Chapter response:", JSON.stringify(response, null, 2));

      return NextResponse.json(
        {
          error: "Response validation failed",
          details: validationResult.error.issues,
        },
        { status: 500 }
      );
    }

    console.log("API response:", validationResult.data);
    return NextResponse.json(validationResult.data);
  } catch (error) {
    console.error("Error fetching chapter:", error);

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const errorResponse = ApiErrorSchema.parse({
        error: "Invalid chapter parameters or data",
        details: error.issues
          .map((e: any) => `${e.path.join(".")}: ${e.message}`)
          .join(", "),
      });
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const errorResponse = ApiErrorSchema.parse({
      error: "Failed to fetch chapter",
      details: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
