import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  tagTypes,
  genreTypes,
  movies,
  tvShows,
  comics,
  ebooks,
  users,
} from "@/lib/db/schema";
import { seedAll } from "@/lib/seed";

export async function POST() {
  try {
    // Check if database is already seeded by checking if tags exist
    const existingTags = await db.select().from(tagTypes).limit(1);
    const existingGenres = await db.select().from(genreTypes).limit(1);
    const existingMovies = await db.select().from(movies).limit(1);
    const existingTvShows = await db.select().from(tvShows).limit(1);
    const existingComics = await db.select().from(comics).limit(1);
    const existingEbooks = await db.select().from(ebooks).limit(1);
    const existingUsers = await db.select().from(users).limit(1);

    // If any data exists, assume already seeded
    if (
      existingTags.length > 0 ||
      existingGenres.length > 0 ||
      existingMovies.length > 0 ||
      existingTvShows.length > 0 ||
      existingComics.length > 0 ||
      existingEbooks.length > 0 ||
      existingUsers.length > 0
    ) {
      return NextResponse.json({
        message: "Database already seeded",
        skipped: true,
      });
    }

    // Seed the database
    await seedAll();

    return NextResponse.json({
      message: "Database seeded successfully",
      seeded: true,
    });
  } catch (error) {
    console.error("Seed initialization error:", error);
    return NextResponse.json(
      {
        error: "Failed to seed database",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Also allow GET for easier testing
export async function GET() {
  return POST();
}
