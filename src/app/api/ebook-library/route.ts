import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ebooks } from "@/lib/db/schema";
import { or, and, sql, asc, desc } from "drizzle-orm";
import {
  EbooksQueryParamsSchema,
  EbooksResponseSchema,
  EbookApiErrorSchema,
} from "@/lib/schemas/ebooks";
import { ZodError } from "zod";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    let queryParams;
    try {
      queryParams = EbooksQueryParamsSchema.parse({
        page: searchParams.get("page"),
        search: searchParams.get("search"),
      });
    } catch (parseError) {
      console.error("Query parameter validation error:", parseError);
      throw parseError;
    }

    const { page, search } = queryParams;
    const itemsPerPage = 15;

    // Build conditions array
    const conditions = [];

    if (search) {
      // Use SQLite-compatible case-insensitive search with lower()
      const searchLower = search.toLowerCase();
      conditions.push(
        or(
          sql`lower(${ebooks.ebookTitle}) LIKE ${`%${searchLower}%`}`,
          sql`lower(${ebooks.ebookAuthor}) LIKE ${`%${searchLower}%`}`
        )
      );
    }

    // Build the where clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(ebooks)
      .where(whereClause);

    const totalItems = parseInt(countResult[0]?.count?.toString() || "0");

    // Get ebooks with pagination, ordered by author
    const ebooksResult = await db
      .select()
      .from(ebooks)
      .where(whereClause)
      .orderBy(asc(ebooks.ebookAuthor))
      .limit(itemsPerPage)
      .offset((page - 1) * itemsPerPage);

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Prepare response data
    const responseData = {
      ebooks: ebooksResult.map((ebook) => ({
        id: ebook.id,
        title: ebook.ebookTitle,
        author: ebook.ebookAuthor,
        address: ebook.ebookAddress,
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage,
      },
    };

    // Validate response with Zod schema
    const validationResult = EbooksResponseSchema.safeParse(responseData);

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
    console.error("Error fetching ebooks:", error);

    if (error instanceof ZodError) {
      const errorResponse = EbookApiErrorSchema.parse({
        error: "Invalid query parameters",
        details: error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", "),
      });
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const errorResponse = EbookApiErrorSchema.parse({
      error: "Failed to fetch ebooks",
      details: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
