import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { genreTypes } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { ensureSchema } from "@/lib/db/ensure-schema";

export async function GET() {
  try {
    // Ensure database schema is initialized before proceeding
    await ensureSchema();
    
    const result = await db
      .select({ genreName: genreTypes.genreName })
      .from(genreTypes)
      .where(eq(genreTypes.isActive, true))
      .orderBy(asc(genreTypes.genreName));

    const genres = result.map((row) => row.genreName);

    return NextResponse.json({ genres });
  } catch (error) {
    console.error("Error fetching genres:", error);
    return NextResponse.json(
      { error: "Failed to fetch genres" },
      { status: 500 }
    );
  }
}

