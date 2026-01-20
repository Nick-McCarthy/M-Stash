import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { movies, videoVersions } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import { MovieSchema, MovieApiErrorSchema } from "@/lib/schemas/movies";
import { ZodError } from "zod";
import { parseJsonArray } from "@/lib/db/sqlite-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ movie: string }> }
) {
  try {
    const { movie } = await params;

    // Validate movie ID parameter
    const movieId = z.coerce.number().int().positive().parse(movie);

    // Get movie details
    const movieResult = await db
      .select()
      .from(movies)
      .where(eq(movies.movieId, movieId))
      .limit(1);

    if (movieResult.length === 0) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    const movieData = movieResult[0];

    // Fetch video versions (resolution variants: 480, 720, 1080, etc.) for debugging
    const videoVersionsResult = await db
      .select()
      .from(videoVersions)
      .where(eq(videoVersions.movieId, movieId))
      .orderBy(asc(videoVersions.resolution));

    // Debug: Log the master playlist address and available resolutions
    console.log("📹 Movie data from DB:", {
      movieId: movieData.movieId,
      title: movieData.title,
      masterPlaylistAddress: movieData.masterPlaylistAddress,
      availableResolutions: videoVersionsResult.map(v => ({
        resolution: v.resolution,
        basePath: v.basePath,
        playlistPath: v.playlistPath,
        isDefault: v.isDefault,
      })),
    });

    // Format the movie data to match the schema
    const formattedMovie = {
      movie_id: movieData.movieId,
      title: movieData.title,
      thumbnail_address: movieData.thumbnailAddress,
      sprite_address: movieData.spriteAddress,
      video_address: movieData.masterPlaylistAddress,
      tags: parseJsonArray(movieData.tags as string),
      views: movieData.views,
      updated_at: movieData.updatedAt,
    };

    // Debug: Log formatted movie
    console.log("📤 Formatted movie for API:", {
      video_address: formattedMovie.video_address,
      video_address_type: typeof formattedMovie.video_address,
      video_address_length: formattedMovie.video_address?.length,
    });

    // Validate response with Zod schema
    const validationResult = MovieSchema.safeParse(formattedMovie);

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

    return NextResponse.json(validationResult.data);
  } catch (error) {
    console.error("Error fetching movie:", error);

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const errorResponse = MovieApiErrorSchema.parse({
        error: "Invalid movie ID",
        details: error.issues
          .map((e: any) => `${e.path.join(".")}: ${e.message}`)
          .join(", "),
      });
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const errorResponse = MovieApiErrorSchema.parse({
      error: "Failed to fetch movie",
      details: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

