import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tagTypes } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  try {
    const result = await db
      .select({ tagName: tagTypes.tagName })
      .from(tagTypes)
      .where(eq(tagTypes.isActive, true))
      .orderBy(asc(tagTypes.tagName));

    const tags = result.map((row) => row.tagName);

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}
