import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { movies } from "@/lib/db/schema";
import { MovieApiErrorSchema } from "@/lib/schemas/movies";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const IncrementMovieViewResponseSchema = z.object({
  movie_id: z.number().int().positive(),
  views: z.number().int().nonnegative(),
});

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ movie: string }> }
) {
  try {
    const { movie } = await params;

    const movieId = z.coerce.number().int().positive().parse(movie);

    const updated = await db
      .update(movies)
      .set({
        views: sql`${movies.views} + 1`,
      })
      .where(eq(movies.movieId, movieId))
      .returning({
        movieId: movies.movieId,
        views: movies.views,
      });

    if (updated.length === 0) {
      const errorResponse = MovieApiErrorSchema.parse({
        error: "Movie not found",
      });
      return NextResponse.json(errorResponse, { status: 404 });
    }

    const responseBody = IncrementMovieViewResponseSchema.parse({
      movie_id: updated[0].movieId,
      views: updated[0].views,
    });

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("Error incrementing movie view:", error);

    if (error instanceof z.ZodError) {
      const errorResponse = MovieApiErrorSchema.parse({
        error: "Invalid movie identifier",
        details: error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", "),
      });
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const errorResponse = MovieApiErrorSchema.parse({
      error: "Failed to increment movie view",
      details: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

