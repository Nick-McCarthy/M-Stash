import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comics, comicChapters } from "@/lib/db/schema";
import { eq, ilike, and, desc, asc, sql, inArray } from "drizzle-orm";
import { jsonArrayContains, parseJsonArray } from "@/lib/db/sqlite-helpers";
import {
  ComicsQueryParamsSchema,
  ComicsResponseSchema,
  ApiErrorSchema,
} from "@/lib/schemas/comics";
import { ZodError } from "zod";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const queryParams = ComicsQueryParamsSchema.parse({
      page: searchParams.get("page"),
      itemsPerPage: searchParams.get("itemsPerPage"),
      tag: searchParams.get("tag"),
      search: searchParams.get("search"),
      type: searchParams.get("type"),
      status: searchParams.get("status"),
      sort: searchParams.get("sort"),
    });

    const { page, itemsPerPage, tag, search, type, status, sort } = queryParams;

    // Build conditions array
    const conditions = [];

    if (search !== null && search !== undefined) {
      conditions.push(ilike(comics.comicTitle, `%${search}%`));
    }

    if (tag !== null && tag !== undefined) {
      conditions.push(jsonArrayContains(comics.tags, tag));
    }

    if (type !== null && type !== undefined && type !== "all") {
      conditions.push(eq(comics.comicType, type as any));
    }

    if (status !== null && status !== undefined && status !== "all") {
      conditions.push(eq(comics.status, status as any));
    }

    // Build the where clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(comics)
      .where(whereClause);

    const totalItems = parseInt(countResult[0]?.count?.toString() || "0");

    // Determine sorting
    let orderBy;
    switch (sort) {
      case "az-asc":
        orderBy = asc(comics.comicTitle);
        break;
      case "za-desc":
        orderBy = desc(comics.comicTitle);
        break;
      case "date-updated":
        orderBy = desc(comics.updatedAt);
        break;
      case "views":
        orderBy = desc(comics.views);
        break;
      default:
        orderBy = asc(comics.comicTitle);
    }

    // Get comics with pagination
    const comicsResult = await db
      .select()
      .from(comics)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(itemsPerPage)
      .offset((page - 1) * itemsPerPage);

    // Get recent chapters for each comic (up to 2 most recent per comic)
    const comicIds = comicsResult.map((comic) => comic.comicId);
    let recentChaptersMap: Record<number, any[]> = {};

    if (comicIds.length > 0) {
      try {
        const chaptersResult = await db
          .select({
            comicId: comicChapters.comicId,
            chapterNumber: comicChapters.chapterNumber,
          })
          .from(comicChapters)
          .where(inArray(comicChapters.comicId, comicIds))
          .orderBy(desc(comicChapters.chapterNumber));

        // Group chapters by comic_id (limit to 2 per comic)
        const chaptersByComic: Record<number, any[]> = {};
        chaptersResult.forEach((row) => {
          if (!chaptersByComic[row.comicId]) {
            chaptersByComic[row.comicId] = [];
          }
          if (chaptersByComic[row.comicId].length < 2) {
            chaptersByComic[row.comicId].push({
              number: row.chapterNumber.toString(),
              title: `Chapter ${row.chapterNumber}`,
            });
          }
        });

        recentChaptersMap = chaptersByComic;
      } catch (chaptersError) {
        console.error("Error fetching recent chapters:", chaptersError);
        // Continue without recent chapters if there's an error
      }
    }

    // Add recent chapters to each comic and transform field names to match schema
    const comicsWithChapters = comicsResult.map((comic) => ({
      comic_id: comic.comicId,
      comic_title: comic.comicTitle,
      thumbnail_address: comic.thumbnailAddress,
      comic_description: comic.comicDescription,
      number_of_chapters: comic.numberOfChapters,
      comic_type: comic.comicType,
      tags: parseJsonArray(comic.tags as string),
      views: comic.views,
      updated_at: comic.updatedAt,
      status: comic.status,
      recentChapters: recentChaptersMap[comic.comicId] || [],
    }));

    // Get all unique tags with counts
    // SQLite doesn't have unnest, so we need to fetch all comics and process tags in JavaScript
    const allComicsForTags = await db
      .select({
        tags: comics.tags,
      })
      .from(comics)
      .where(sql`tags IS NOT NULL AND json_array_length(tags) > 0`);

    // Process tags manually
    const tagCounts: Record<string, number> = {};
    allComicsForTags.forEach((row) => {
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
      comics: comicsWithChapters,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage,
      },
      tags,
    };

    // Validate response data with detailed error logging
    const validationResult = ComicsResponseSchema.safeParse(responseData);

    if (!validationResult.success) {
      console.error(
        "Response validation failed:",
        JSON.stringify(validationResult.error.issues, null, 2)
      );
      console.error(
        "Sample comic data:",
        JSON.stringify(comicsWithChapters[0], null, 2)
      );

      // Return detailed error for debugging
      return NextResponse.json(
        {
          error: "Response validation failed",
          details: validationResult.error.issues,
          sampleData: comicsWithChapters[0],
        },
        { status: 500 }
      );
    }

    return NextResponse.json(validationResult.data);
  } catch (error) {
    console.error("Error fetching comics:", error);

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const errorResponse = ApiErrorSchema.parse({
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

    const errorResponse = ApiErrorSchema.parse({
      error: "Failed to fetch comics",
      details: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
