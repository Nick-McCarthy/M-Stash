import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { movies } from "@/lib/db/schema";
import { eq, ilike, and, desc, asc, sql } from "drizzle-orm";
import { jsonArrayContains, parseJsonArray } from "@/lib/db/sqlite-helpers";
import {
  MoviesQueryParamsSchema,
  MoviesResponseSchema,
  MovieApiErrorSchema,
} from "@/lib/schemas/movies";
import { ZodError } from "zod";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    let queryParams;
    try {
      queryParams = MoviesQueryParamsSchema.parse({
        page: searchParams.get("page"),
        itemsPerPage: searchParams.get("itemsPerPage"),
        tag: searchParams.get("tag"),
        search: searchParams.get("search"),
        sort: searchParams.get("sort"),
      });
    } catch (parseError) {
      console.error("Query parameter validation error:", parseError);
      throw parseError;
    }

    const { page, itemsPerPage, tag, search, sort } = queryParams;

    // Build conditions array
    const conditions = [];

    if (search !== null && search !== undefined) {
      conditions.push(ilike(movies.title, `%${search}%`));
    }

    if (tag !== null && tag !== undefined) {
      conditions.push(jsonArrayContains(movies.tags, tag));
    }

    // Build the where clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count for pagination
    let countResult;
    let totalItems = 0;
    try {
      console.log("🔍 Query parameters:", { page, itemsPerPage, tag, search, sort });
      console.log("🔍 Where clause:", whereClause ? "has conditions" : "no conditions");
      
      countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(movies)
        .where(whereClause);
      
      console.log("📊 Count query result:", JSON.stringify(countResult, null, 2));
      totalItems = parseInt(countResult[0]?.count?.toString() || "0");
      console.log("📊 Total items:", totalItems);
    } catch (countError) {
      console.error("Error getting movie count:", countError);
      throw new Error(`Failed to count movies: ${countError instanceof Error ? countError.message : "Unknown error"}`);
    }

    // Determine sorting
    let orderBy;
    switch (sort) {
      case "az-asc":
        orderBy = asc(movies.title);
        break;
      case "za-desc":
        orderBy = desc(movies.title);
        break;
      case "date-updated":
        orderBy = desc(movies.updatedAt);
        break;
      case "views":
        orderBy = desc(movies.views);
        break;
      default:
        orderBy = asc(movies.title);
    }

    // Get movies with pagination
    let moviesResult;
    try {
      moviesResult = await db
        .select()
        .from(movies)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(itemsPerPage)
        .offset((page - 1) * itemsPerPage);
      
      console.log("📊 Database query results:");
      console.log("  - Total movies found:", moviesResult.length);
      console.log("  - Raw database results:", JSON.stringify(moviesResult, null, 2));
    } catch (queryError) {
      console.error("Error fetching movies:", queryError);
      throw new Error(`Failed to fetch movies: ${queryError instanceof Error ? queryError.message : "Unknown error"}`);
    }

    // Transform field names to match schema
    const moviesWithFormattedData = moviesResult.map((movie) => {
      const formatted = {
        movie_id: movie.movieId,
        title: movie.title,
        thumbnail_address: movie.thumbnailAddress,
        sprite_address: movie.spriteAddress,
        video_address: movie.masterPlaylistAddress,
        tags: parseJsonArray(movie.tags as string),
        views: movie.views,
        updated_at: movie.updatedAt,
      };
      console.log("📝 Formatted movie:", JSON.stringify(formatted, null, 2));
      return formatted;
    });
    
    console.log("✅ Formatted movies array:", JSON.stringify(moviesWithFormattedData, null, 2));

    // Get all unique tags with counts
    // SQLite doesn't have unnest, so we need to fetch all movies and process tags in JavaScript
    let allMoviesForTags: Array<{ tags: string }> = [];
    try {
      allMoviesForTags = await db
        .select({
          tags: movies.tags,
        })
        .from(movies)
        .where(sql`tags IS NOT NULL AND json_array_length(tags) > 0`);
    } catch (tagError) {
      console.error("Error fetching tags:", tagError);
      // If tag query fails, just use empty tags array
      allMoviesForTags = [];
    }

    // Process tags manually
    const tagCounts: Record<string, number> = {};
    allMoviesForTags.forEach((row) => {
      const tagArray = parseJsonArray(row.tags as string);
      tagArray.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const tags = Object.entries(tagCounts)
      .map(([label, count]) => ({
        id: label.toLowerCase().replace(/\s+/g, "-"),
        label,
        count,
      }))
      .sort((a, b) => {
        // Sort by count descending, then by label ascending
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return a.label.localeCompare(b.label);
      });

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Prepare response data
    const responseData = {
      movies: moviesWithFormattedData,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage,
      },
      tags,
    };

    console.log("📦 Response data before validation:");
    console.log("  - Movies count:", responseData.movies.length);
    console.log("  - Total items:", responseData.pagination.totalItems);
    console.log("  - Total pages:", responseData.pagination.totalPages);
    console.log("  - Tags count:", responseData.tags.length);
    if (responseData.movies.length > 0) {
      console.log("  - Sample movie:", JSON.stringify(responseData.movies[0], null, 2));
    } else {
      console.log("  - ⚠️ No movies in response data");
    }

    // Validate response data with detailed error logging
    const validationResult = MoviesResponseSchema.safeParse(responseData);

    if (!validationResult.success) {
      console.error("❌ Response validation failed:");
      console.error("  - Validation errors:", JSON.stringify(validationResult.error.issues, null, 2));
      if (moviesWithFormattedData.length > 0) {
        console.error("  - Sample movie data:", JSON.stringify(moviesWithFormattedData[0], null, 2));
      }

      // Return detailed error for debugging
      return NextResponse.json(
        {
          error: "Response validation failed",
          details: validationResult.error.issues,
          sampleData: moviesWithFormattedData[0] || null,
        },
        { status: 500 }
      );
    }

    console.log("✅ Validation passed, returning response");
    return NextResponse.json(validationResult.data);
  } catch (error) {
    console.error("Error fetching movies:", error);

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const errorResponse = MovieApiErrorSchema.parse({
        error: "Invalid request parameters",
        details: error.issues
          .map((e: any) => `${e.path.join(".")}: ${e.message}`)
          .join(", "),
      });
      return NextResponse.json(errorResponse, { status: 400 });
    }

    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    const errorResponse = MovieApiErrorSchema.parse({
      error: "Failed to fetch movies",
      details: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
