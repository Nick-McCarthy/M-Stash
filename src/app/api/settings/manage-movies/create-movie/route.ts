import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { movies } from "@/lib/db/schema";
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

// Schema for creating a movie
const CreateMovieDataSchema = z.object({
  title: z.string().min(1, "Movie title is required"),
  sprite_address: z.string().url("Sprite address must be a valid URL"),
  thumbnail_address: z.string().url("Thumbnail address must be a valid URL"),
  master_playlist_address: z.string().url("Master playlist address must be a valid URL"),
  tags: z.array(z.string()).default([]),
  genres: z.array(z.string()).default([]),
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const thumbnailFile = formData.get("thumbnail") as File | null;
    const spriteFile = formData.get("sprite") as File | null;
    const masterPlaylistFile = formData.get("master_playlist") as File | null;
    const title = formData.get("title") as string;
    const spriteAddress = formData.get("sprite_address") as string | null;
    const thumbnailAddress = formData.get("thumbnail_address") as string | null;
    const masterPlaylistAddress = formData.get("master_playlist_address") as string | null;
    const tagsString = formData.get("tags") as string;
    const genresString = formData.get("genres") as string;

    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { error: "Movie title is required" },
        { status: 400 }
      );
    }

    // Parse tags and genres
    const tags = tagsString ? JSON.parse(tagsString) : [];
    const genres = genresString ? JSON.parse(genresString) : [];

    // Sanitize the movie title for use in file path
    const sanitizedTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    let finalThumbnailAddress = thumbnailAddress;
    let finalSpriteAddress = spriteAddress;
    let finalMasterPlaylistAddress = masterPlaylistAddress;

    // Upload thumbnail if provided
    if (thumbnailFile) {
      const fileExtension = thumbnailFile.name.split(".").pop()?.toLowerCase();
      if (
        !fileExtension ||
        !["jpg", "jpeg", "png", "gif", "webp"].includes(fileExtension)
      ) {
        return NextResponse.json(
          {
            error: "Invalid thumbnail file type. Only JPG, PNG, GIF, and WebP are allowed.",
          },
          { status: 400 }
        );
      }

      const s3Key = `movie/${sanitizedTitle}/thumbnail.${fileExtension}`;
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

    // Upload sprite if provided
    if (spriteFile) {
      const fileExtension = spriteFile.name.split(".").pop()?.toLowerCase();
      if (!fileExtension || !["jpg", "jpeg", "png"].includes(fileExtension)) {
        return NextResponse.json(
          {
            error: "Invalid sprite file type. Only JPG and PNG are allowed.",
          },
          { status: 400 }
        );
      }

      const s3Key = `movie/${sanitizedTitle}/sprite.${fileExtension}`;
      const buffer = Buffer.from(await spriteFile.arrayBuffer());

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: buffer,
        ContentType: spriteFile.type,
      });

      await s3Client.send(command);
      finalSpriteAddress = `https://${BUCKET_NAME}.s3.${
        process.env.AWS_REGION || "us-east-1"
      }.amazonaws.com/${s3Key}`;
    }

    // Upload master playlist if provided
    if (masterPlaylistFile) {
      const fileExtension = masterPlaylistFile.name.split(".").pop()?.toLowerCase();
      if (fileExtension !== "m3u8") {
        return NextResponse.json(
          {
            error: "Invalid playlist file type. Only M3U8 files are allowed.",
          },
          { status: 400 }
        );
      }

      const s3Key = `movie/${sanitizedTitle}/master.m3u8`;
      const buffer = Buffer.from(await masterPlaylistFile.arrayBuffer());

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: buffer,
        ContentType: "application/vnd.apple.mpegurl",
      });

      await s3Client.send(command);
      finalMasterPlaylistAddress = `https://${BUCKET_NAME}.s3.${
        process.env.AWS_REGION || "us-east-1"
      }.amazonaws.com/${s3Key}`;
    }

    // Validate that all required addresses are present
    if (!finalThumbnailAddress || !finalSpriteAddress || !finalMasterPlaylistAddress) {
      return NextResponse.json(
        {
          error: "Thumbnail address, sprite address, and master playlist address are all required. Either upload files or provide URLs.",
        },
        { status: 400 }
      );
    }

    // Validate input data
    const validatedData = CreateMovieDataSchema.parse({
      title,
      sprite_address: finalSpriteAddress,
      thumbnail_address: finalThumbnailAddress,
      master_playlist_address: finalMasterPlaylistAddress,
      tags,
      genres,
    });

    // Insert movie into database
    const newMovie = await db
      .insert(movies)
      .values({
        title: validatedData.title,
        thumbnailAddress: validatedData.thumbnail_address,
        spriteAddress: validatedData.sprite_address,
        masterPlaylistAddress: validatedData.master_playlist_address,
        tags: stringifyJsonArray(validatedData.tags),
        genres: stringifyJsonArray(validatedData.genres),
      })
      .returning();

    return NextResponse.json(
      {
        movie_id: newMovie[0].movieId,
        title: newMovie[0].title,
        thumbnail_address: newMovie[0].thumbnailAddress,
        sprite_address: newMovie[0].spriteAddress,
        master_playlist_address: newMovie[0].masterPlaylistAddress,
        tags: validatedData.tags,
        genres: validatedData.genres,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating movie:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", "),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create movie",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

