import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comics } from "@/lib/db/schema";
import {
  CreateComicDataSchema,
  ComicSchema,
  ApiErrorSchema,
} from "@/lib/schemas/comics";
import { ZodError } from "zod";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { stringifyJsonArray, parseJsonArray } from "@/lib/db/sqlite-helpers";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("thumbnail") as File;
    const comicTitle = formData.get("comic_title") as string;
    const comicDescription = formData.get("comic_description") as string;
    const comicType = formData.get("comic_type") as string;
    const tagsString = formData.get("tags") as string;

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: "Thumbnail file is required" },
        { status: 400 }
      );
    }

    if (!comicTitle || !comicType) {
      return NextResponse.json(
        { error: "Comic title and type are required" },
        { status: 400 }
      );
    }

    // Parse tags
    const tags = tagsString ? JSON.parse(tagsString) : [];

    // Sanitize the comic title for use in file path
    const sanitizedTitle = comicTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    // Get file extension
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    if (
      !fileExtension ||
      !["jpg", "jpeg", "png", "gif", "webp"].includes(fileExtension)
    ) {
      return NextResponse.json(
        {
          error: "Invalid file type. Only JPG, PNG, GIF, and WebP are allowed.",
        },
        { status: 400 }
      );
    }

    // Create the S3 key with the desired folder structure
    // Format: /comic/[comic_type]/[comic_title]/thumbnail.[file_extension]
    const s3Key = `comic/${comicType}/${sanitizedTitle}/thumbnail.${fileExtension}`;

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: file.type,
      // Note: ACL removed - bucket should have public read policy instead
    });

    await s3Client.send(command);

    // Construct the public URL
    const publicUrl = `https://${BUCKET_NAME}.s3.${
      process.env.AWS_REGION || "us-east-1"
    }.amazonaws.com/${s3Key}`;

    // Validate input data AFTER S3 upload (now we have the thumbnail URL)
    const validatedData = CreateComicDataSchema.parse({
      comic_title: comicTitle,
      thumbnail_address: publicUrl, // Now we have the actual S3 URL
      comic_description: comicDescription || undefined,
      comic_type: comicType as "manga" | "webtoon" | "western",
      tags: tags,
    });

    // Insert comic into database using Drizzle
    const newComic = await db
      .insert(comics)
      .values({
        comicTitle: validatedData.comic_title,
        thumbnailAddress: publicUrl, // Use the S3 URL
        comicDescription: validatedData.comic_description || null,
        comicType: validatedData.comic_type,
        status: "ongoing", // Default status
        tags: stringifyJsonArray(validatedData.tags),
        // createdAt and updatedAt are handled by database defaults
      })
      .returning();

    // Transform the response to match frontend schema (camelCase to snake_case)
    const comicData = newComic[0];
    const responseData = {
      comic_id: comicData.comicId,
      comic_title: comicData.comicTitle,
      thumbnail_address: comicData.thumbnailAddress,
      comic_description: comicData.comicDescription,
      comic_type: comicData.comicType,
      status: comicData.status,
      tags: parseJsonArray(comicData.tags as string),
      number_of_chapters: comicData.numberOfChapters,
      views: comicData.views,
      updated_at: comicData.updatedAt,
      recentChapters: [], // Empty array for new comics
    };

    // Validate response with ComicSchema
    const validationResult = ComicSchema.safeParse(responseData);
    if (!validationResult.success) {
      console.error("Response validation failed:", validationResult.error);
      return NextResponse.json(
        { error: "Invalid response format" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ...validationResult.data,
        s3Key: s3Key,
        thumbnailUrl: publicUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating comic:", error);

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const errorResponse = ApiErrorSchema.parse({
        error: "Invalid request data",
        details: error.issues
          .map((e: any) => `${e.path.join(".")}: ${e.message}`)
          .join(", "),
      });
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Handle SQLite unique constraint violation
    if (
      error instanceof Error &&
      (error.message.includes("UNIQUE constraint failed") ||
        (error as any).code === "SQLITE_CONSTRAINT_UNIQUE")
    ) {
      const errorResponse = ApiErrorSchema.parse({
        error: "A comic with this title already exists",
        details: "Comic titles must be unique. Please choose a different title.",
      });
      return NextResponse.json(errorResponse, { status: 409 });
    }

    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    const errorResponse = ApiErrorSchema.parse({
      error: "Failed to create comic",
      details: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
