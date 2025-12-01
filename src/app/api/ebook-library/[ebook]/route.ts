import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ebooks, ebookBookmarks } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ebook: string }> }
) {
  try {
    const { ebook } = await params;

    // Validate ebook ID parameter
    const ebookId = z.coerce.number().int().positive().parse(ebook);

    // Get ebook details
    const ebookResult = await db
      .select()
      .from(ebooks)
      .where(eq(ebooks.id, ebookId))
      .limit(1);

    if (ebookResult.length === 0) {
      return NextResponse.json({ error: "Ebook not found" }, { status: 404 });
    }

    const ebookData = ebookResult[0];

    // Get all bookmarks for this ebook, ordered by creation date
    const bookmarksResult = await db
      .select()
      .from(ebookBookmarks)
      .where(eq(ebookBookmarks.ebookId, ebookId))
      .orderBy(asc(ebookBookmarks.createdAt));

    const bookmarks = bookmarksResult.map((bookmark) => ({
      bookmark_id: bookmark.bookmarkId,
      bookmark_name: bookmark.bookmarkName,
      chapter_title: bookmark.chapterTitle,
      cfi: bookmark.cfi,
      position_percentage: bookmark.positionPercentage,
      created_at: bookmark.createdAt,
      updated_at: bookmark.updatedAt,
    }));

    // Format the ebook data
    const formattedEbook = {
      id: ebookData.id,
      title: ebookData.ebookTitle,
      author: ebookData.ebookAuthor,
      address: ebookData.ebookAddress,
      bookmarks,
    };

    return NextResponse.json(formattedEbook);
  } catch (error) {
    console.error("Error fetching ebook:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid ebook ID",
          details: error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join(", "),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to fetch ebook",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
