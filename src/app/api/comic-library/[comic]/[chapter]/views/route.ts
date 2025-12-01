import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comics } from "@/lib/db/schema";
import {
  ApiErrorSchema,
  IncrementComicViewResponseSchema,
} from "@/lib/schemas/comics";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ comic: string; chapter: string }> }
) {
  try {
    const { comic } = await params;

    const comicId = z.coerce.number().int().positive().parse(comic);

    const updated = await db
      .update(comics)
      .set({
        views: sql`${comics.views} + 1`,
      })
      .where(eq(comics.comicId, comicId))
      .returning({
        comicId: comics.comicId,
        views: comics.views,
      });

    if (updated.length === 0) {
      const errorResponse = ApiErrorSchema.parse({
        error: "Comic not found",
      });
      return NextResponse.json(errorResponse, { status: 404 });
    }

    const responseBody = IncrementComicViewResponseSchema.parse({
      comic_id: updated[0].comicId,
      views: updated[0].views,
    });

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("Error incrementing comic view:", error);

    if (error instanceof z.ZodError) {
      const errorResponse = ApiErrorSchema.parse({
        error: "Invalid comic identifier",
        details: error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", "),
      });
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const errorResponse = ApiErrorSchema.parse({
      error: "Failed to increment comic view",
      details: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
