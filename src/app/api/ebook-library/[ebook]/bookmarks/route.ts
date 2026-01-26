import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ebookBookmarks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  CreateBookmarkSchema,
  CreateBookmarkResponseSchema,
  EbookApiErrorSchema,
} from "@/lib/schemas/ebooks";

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

    const responseData = {
      bookmark_id: bookmark.bookmarkId,
      bookmark_name: bookmark.bookmarkName,
      chapter_title: bookmark.chapterTitle,
      cfi: bookmark.cfi,
      position_percentage: bookmark.positionPercentage,
      created_at: bookmark.createdAt,
      updated_at: bookmark.updatedAt,
    };

    // Validate response with Zod schema
    const validationResult = CreateBookmarkResponseSchema.safeParse({
      bookmark_id: responseData.bookmark_id,
      bookmark_name: responseData.bookmark_name,
      chapter_title: responseData.chapter_title,
      cfi: responseData.cfi,
      position_percentage: responseData.position_percentage,
      created_at:
        responseData.created_at instanceof Date
          ? responseData.created_at.toISOString()
          : responseData.created_at,
      updated_at:
        responseData.updated_at instanceof Date
          ? responseData.updated_at.toISOString()
          : responseData.updated_at,
    });

    if (!validationResult.success) {
      console.error(
        "Response validation failed:",
        JSON.stringify(validationResult.error.issues, null, 2)
      );
      return NextResponse.json(
        {
          error: "Response validation failed",
          details: validationResult.error.issues,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    console.error("Error creating bookmark:", error);

    if (error instanceof z.ZodError) {
      const errorResponse = EbookApiErrorSchema.parse({
        error: "Invalid request data",
        details: error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", "),
      });
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const errorResponse = EbookApiErrorSchema.parse({
      error: "Failed to create bookmark",
      details: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ebook: string }> }
) {
  try {
    const { ebook } = await params;
    const { searchParams } = new URL(request.url);
    const bookmarkId = searchParams.get("bookmarkId");

    // Validate ebook ID parameter
    const ebookId = z.coerce.number().int().positive().parse(ebook);

    // Validate bookmark ID
    if (!bookmarkId) {
      return NextResponse.json(
        { error: "Bookmark ID is required" },
        { status: 400 }
      );
    }

    const validatedBookmarkId = z.coerce.number().int().positive().parse(bookmarkId);

    // Check if bookmark exists and belongs to this ebook
    const bookmarkResult = await db
      .select()
      .from(ebookBookmarks)
      .where(eq(ebookBookmarks.bookmarkId, validatedBookmarkId))
      .limit(1);

    if (bookmarkResult.length === 0) {
      return NextResponse.json(
        { error: "Bookmark not found" },
        { status: 404 }
      );
    }

    const bookmark = bookmarkResult[0];

    // Verify the bookmark belongs to this ebook
    if (bookmark.ebookId !== ebookId) {
      return NextResponse.json(
        { error: "Bookmark does not belong to this ebook" },
        { status: 403 }
      );
    }

    // Delete the bookmark
    await db
      .delete(ebookBookmarks)
      .where(eq(ebookBookmarks.bookmarkId, validatedBookmarkId));

    return NextResponse.json(
      { message: "Bookmark deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting bookmark:", error);

    if (error instanceof z.ZodError) {
      const errorResponse = EbookApiErrorSchema.parse({
        error: "Invalid request data",
        details: error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", "),
      });
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const errorResponse = EbookApiErrorSchema.parse({
      error: "Failed to delete bookmark",
      details: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(errorResponse, { status: 500 });
  }
}