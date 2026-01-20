import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ebooks } from "@/lib/db/schema";
import { or, and, sql, asc, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const itemsPerPage = 15;
    const search = searchParams.get("search") || "";

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

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching ebooks:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch ebooks",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
