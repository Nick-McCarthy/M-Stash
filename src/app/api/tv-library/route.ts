import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tvShows } from "@/lib/db/schema";
import { eq, ilike, and, desc, asc, sql } from "drizzle-orm";
import { jsonArrayContains, parseJsonArray } from "@/lib/db/sqlite-helpers";
import { ZodError } from "zod";
import {
  TvShowsQueryParamsSchema,
  TvShowsResponseSchema,
  TvShowApiErrorSchema,
} from "@/lib/schemas/tv-shows";
import { ensureSchema } from "@/lib/db/ensure-schema";

export async function GET(request: NextRequest) {
  try {
    // Ensure database schema is initialized before proceeding
    await ensureSchema();
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    let queryParams;
    try {
      queryParams = TvShowsQueryParamsSchema.parse({
        page: searchParams.get("page"),
        itemsPerPage: searchParams.get("itemsPerPage"),
        tag: searchParams.get("tag"),
        genre: searchParams.get("genre"),
        search: searchParams.get("search"),
        sort: searchParams.get("sort"),
      });
    } catch (parseError) {
      console.error("Query parameter validation error:", parseError);
      throw parseError;
    }

    const { page, itemsPerPage, tag, genre, search, sort } = queryParams;

    // Build conditions array
    const conditions = [];

    if (search !== null && search !== undefined) {
      conditions.push(ilike(tvShows.title, `%${search}%`));
    }

    if (tag !== null && tag !== undefined) {
      conditions.push(jsonArrayContains(tvShows.tags, tag));
    }

    if (genre !== null && genre !== undefined) {
      conditions.push(jsonArrayContains(tvShows.genres, genre));
    }

    // Build the where clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count for pagination
    let countResult;
    let totalItems = 0;
    try {
      countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(tvShows)
        .where(whereClause);
      totalItems = parseInt(countResult[0]?.count?.toString() || "0");
    } catch (countError) {
      console.error("Error getting TV show count:", countError);
      throw new Error(`Failed to count TV shows: ${countError instanceof Error ? countError.message : "Unknown error"}`);
    }

    // Determine sorting
    let orderBy;
    switch (sort) {
      case "az-asc":
        orderBy = asc(tvShows.title);
        break;
      case "za-desc":
        orderBy = desc(tvShows.title);
        break;
      case "date-updated":
        orderBy = desc(tvShows.updatedAt);
        break;
      case "views":
        orderBy = desc(tvShows.views);
        break;
      default:
        orderBy = asc(tvShows.title);
    }

    // Get TV shows with pagination
    let tvShowsResult;
    try {
      tvShowsResult = await db
        .select()
        .from(tvShows)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(itemsPerPage)
        .offset((page - 1) * itemsPerPage);
    } catch (queryError) {
      console.error("Error fetching TV shows:", queryError);
      // If the error is about missing column, try to add it and retry
      if (queryError instanceof Error && queryError.message.includes("no such column: genres")) {
        // Column doesn't exist, add it
        const { sqlite } = await import("@/lib/db/db-connection");
        try {
          sqlite.exec(`ALTER TABLE tv_shows ADD COLUMN genres TEXT NOT NULL DEFAULT '[]'`);
          console.log("  ✓ Added genres column to tv_shows table");
          // Retry the query
          tvShowsResult = await db
            .select()
            .from(tvShows)
            .where(whereClause)
            .orderBy(orderBy)
            .limit(itemsPerPage)
            .offset((page - 1) * itemsPerPage);
        } catch (retryError) {
          console.error("Error retrying after adding column:", retryError);
          throw new Error(`Failed to fetch TV shows: ${queryError.message}`);
        }
      } else {
        throw new Error(`Failed to fetch TV shows: ${queryError instanceof Error ? queryError.message : "Unknown error"}`);
      }
    }

    // Transform field names to match expected format
    const tvShowsWithFormattedData = tvShowsResult.map((show) => {
      // Handle case where genres column might not exist in older databases
      const genresValue = (show as any).genres;
      return {
        tv_show_id: show.tvShowId,
        title: show.title,
        thumbnail_address: show.thumbnailAddress,
        description: show.description,
        tags: parseJsonArray(show.tags as string),
        genres: parseJsonArray(genresValue || "[]"),
        views: show.views,
        updated_at: show.updatedAt,
      };
    });

    // Get all unique tags with counts
    let allShowsForTags: Array<{ tags: string }> = [];
    try {
      allShowsForTags = await db
        .select({
          tags: tvShows.tags,
        })
        .from(tvShows)
        .where(sql`tags IS NOT NULL AND json_array_length(tags) > 0`);
    } catch (tagError) {
      console.error("Error fetching tags:", tagError);
      allShowsForTags = [];
    }

    // Process tags manually
    const tagCounts: Record<string, number> = {};
    allShowsForTags.forEach((row) => {
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
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return a.label.localeCompare(b.label);
      });

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const responseData = {
      tv_shows: tvShowsWithFormattedData,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage,
      },
      tags,
    };

    // Validate response with Zod schema
    const validationResult = TvShowsResponseSchema.safeParse(responseData);

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
    console.error("Error in TV library route:", error);

    if (error instanceof ZodError) {
      const errorResponse = TvShowApiErrorSchema.parse({
        error: "Invalid query parameters",
        details: error.issues
          .map((e: any) => `${e.path.join(".")}: ${e.message}`)
          .join(", "),
      });
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const errorResponse = TvShowApiErrorSchema.parse({
      error: "Failed to fetch TV shows",
      details: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

