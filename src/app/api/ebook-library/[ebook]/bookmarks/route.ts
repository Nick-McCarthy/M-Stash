import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ebookBookmarks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

// Schema for creating a bookmark
const CreateBookmarkSchema = z.object({
  bookmark_name: z.string().min(1, "Bookmark name is required").max(200),
  chapter_title: z.string().optional(),
  cfi: z.string().min(1, "CFI (location) is required"), // CFI string - the recommended way to store EPUB locations
  position_percentage: z
    .number()
    .min(0, "Position percentage must be between 0 and 100")
    .max(100, "Position percentage must be between 0 and 100")
    .optional(), // Optional: kept for display purposes
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ebook: string }> }
) {
  try {
    const { ebook } = await params;
    const body = await request.json();

    // Validate ebook ID parameter
    const ebookId = z.coerce.number().int().positive().parse(ebook);

    // Validate request body
    const validatedData = CreateBookmarkSchema.parse(body);

    // Create bookmark
    const newBookmark = await db
      .insert(ebookBookmarks)
      .values({
        ebookId: ebookId,
        bookmarkName: validatedData.bookmark_name,
        chapterTitle: validatedData.chapter_title || null,
        cfi: validatedData.cfi,
        positionPercentage: validatedData.position_percentage || null,
      })
      .returning();

    const bookmark = newBookmark[0];

    return NextResponse.json(
      {
        bookmark_id: bookmark.bookmarkId,
        bookmark_name: bookmark.bookmarkName,
        chapter_title: bookmark.chapterTitle,
        cfi: bookmark.cfi,
        position_percentage: bookmark.positionPercentage,
        created_at: bookmark.createdAt,
        updated_at: bookmark.updatedAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating bookmark:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join(", "),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create bookmark",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
