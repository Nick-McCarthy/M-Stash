import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tvShows } from "@/lib/db/schema";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { stringifyJsonArray } from "@/lib/db/sqlite-helpers";
import { z } from "zod";

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
    if (
      !BUCKET_NAME ||
      !process.env.AWS_ACCESS_KEY_ID ||
      !process.env.AWS_SECRET_ACCESS_KEY
    ) {
      return NextResponse.json(
        {
          error: "AWS configuration is missing. Please check your environment variables.",
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const thumbnailFile = formData.get("thumbnail") as File | null;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const thumbnailAddress = formData.get("thumbnail_address") as string | null;
    const tagsString = formData.get("tags") as string;

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "TV show title is required" },
        { status: 400 }
      );
    }

    if (!thumbnailFile && !thumbnailAddress) {
      return NextResponse.json(
        {
          error:
            "Thumbnail is required. Either upload a file or provide a URL.",
        },
        { status: 400 }
      );
    }

    // Parse tags
    let tags: string[] = [];
    if (tagsString) {
      try {
        tags = JSON.parse(tagsString);
        if (!Array.isArray(tags)) {
          tags = [];
        }
      } catch (e) {
        tags = [];
      }
    }

    // Sanitize the TV show title for use in file path
    const sanitizedTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    let finalThumbnailAddress = thumbnailAddress;

    // Upload thumbnail if provided
    if (thumbnailFile) {
      const fileExtension = thumbnailFile.name.split(".").pop()?.toLowerCase();
      if (
        !fileExtension ||
        !["jpg", "jpeg", "png", "gif", "webp"].includes(fileExtension)
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid thumbnail file type. Only JPG, PNG, GIF, and WebP are allowed.",
          },
          { status: 400 }
        );
      }

      const s3Key = `tv-show/${sanitizedTitle}/thumbnail.${fileExtension}`;
      const buffer = Buffer.from(await thumbnailFile.arrayBuffer());

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: buffer,
        ContentType: thumbnailFile.type,
      });

      await s3Client.send(command);
      finalThumbnailAddress = `https://${BUCKET_NAME}.s3.${
        process.env.AWS_REGION || "us-east-1"
      }.amazonaws.com/${s3Key}`;
    }

    // Validate that thumbnail address is present
    if (!finalThumbnailAddress) {
      return NextResponse.json(
        {
          error: "Thumbnail address is required. Either upload a file or provide a URL.",
        },
        { status: 400 }
      );
    }

    // Validate URL if provided as address
    if (thumbnailAddress) {
      try {
        new URL(thumbnailAddress);
      } catch (e) {
        return NextResponse.json(
          { error: "Thumbnail address must be a valid URL." },
          { status: 400 }
        );
      }
    }

    // Insert TV show into database
    const newTvShow = await db
      .insert(tvShows)
      .values({
        title: title.trim(),
        thumbnailAddress: finalThumbnailAddress,
        description: description?.trim() || null,
        tags: stringifyJsonArray(tags),
      })
      .returning();

    return NextResponse.json(
      {
        tv_show_id: newTvShow[0].tvShowId,
        title: newTvShow[0].title,
        thumbnail_address: newTvShow[0].thumbnailAddress,
        description: newTvShow[0].description,
        tags: tags,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating TV show:", error);

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

    return NextResponse.json(
      {
        error: "Failed to create TV show",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

