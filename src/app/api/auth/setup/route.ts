import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { ensureSchema } from "@/lib/db/ensure-schema";

const SetupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  try {
    // Ensure database schema is initialized before proceeding
    await ensureSchema();
    
    const body = await request.json();
    const { username, password } = SetupSchema.parse(body);

    // Check if a user already exists
    const existingUsers = await db.select().from(users).limit(1);

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: "Master account already exists" },
        { status: 400 }
      );
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create the master user
    const newUser = await db
      .insert(users)
      .values({
        username,
        passwordHash,
      })
      .returning();

    return NextResponse.json(
      {
        message: "Master account created successfully",
        userId: newUser[0].userId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Setup error:", error);
    console.error("Setup error stack:", error instanceof Error ? error.stack : "No stack trace");
    console.error("Setup error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join(", "),
        },
        { status: 400 }
      );
    }

    // Include more details in the error response for debugging
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      {
        error: "Failed to create master account",
        details: errorMessage,
        // Only include stack in development
        ...(process.env.NODE_ENV === "development" && errorStack ? { stack: errorStack } : {}),
      },
      { status: 500 }
    );
  }
}

