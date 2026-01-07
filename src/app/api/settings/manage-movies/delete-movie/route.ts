import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { movies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const DeleteMovieSchema = z.object({
  movie_id: z.coerce.number().int().positive(),
});

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const movieId = searchParams.get("movie_id");

    if (!movieId) {
      return NextResponse.json(
        { error: "Movie ID is required" },
        { status: 400 }
      );
    }

    // Validate movie ID
    const validatedData = DeleteMovieSchema.parse({ movie_id: movieId });

    // Check if movie exists
    const existingMovie = await db
      .select()
      .from(movies)
      .where(eq(movies.movieId, validatedData.movie_id))
      .limit(1);

    if (existingMovie.length === 0) {
      return NextResponse.json(
        { error: "Movie not found" },
        { status: 404 }
      );
    }

    // Delete the movie (cascade will handle related video versions)
    await db
      .delete(movies)
      .where(eq(movies.movieId, validatedData.movie_id));

    return NextResponse.json(
      {
        message: "Movie deleted successfully",
        movie_id: validatedData.movie_id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting movie:", error);

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
        error: "Failed to delete movie",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

