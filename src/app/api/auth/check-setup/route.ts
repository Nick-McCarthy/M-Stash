import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function GET() {
  try {
    const userCount = await db.select().from(users).limit(1);
    return NextResponse.json({ needsSetup: userCount.length === 0 });
  } catch (error) {
    console.error("Check setup error:", error);
    // On error, assume setup is needed
    return NextResponse.json({ needsSetup: true });
  }
}

