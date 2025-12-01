import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comicChapters } from "@/lib/db/schema";
import { eq, inArray, and } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: { comic: string } }
) {
  try {
    const comicId = parseInt(params.comic);
    const { chapterNumbers } = await request.json();

    if (!chapterNumbers || !Array.isArray(chapterNumbers)) {
      return NextResponse.json(
        { error: "Chapter numbers array is required" },
        { status: 400 }
      );
    }

    // Check which chapters already exist
    const existingChapters = await db
      .select({ chapterNumber: comicChapters.chapterNumber })
      .from(comicChapters)
      .where(
        and(
          eq(comicChapters.comicId, comicId),
          inArray(
            comicChapters.chapterNumber,
            chapterNumbers.map((num) => num.toString())
          )
        )
      );

    const existingChapterNumbers = existingChapters.map((row) =>
      row.chapterNumber.toString()
    );

    return NextResponse.json(existingChapterNumbers);
  } catch (error) {
    console.error("Check chapters error:", error);
    return NextResponse.json(
      { error: "Failed to check existing chapters" },
      { status: 500 }
    );
  }
}
