import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { db } from "@/lib/db";
import { comicChapters, chapterImages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const s3Client = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const comicId = formData.get("comicId") as string;
    const comicTitle = formData.get("comicTitle") as string;
    const comicType = formData.get("comicType") as string;
    const chapterNumber = formData.get("chapterNumber") as string;
    const imageOrder = formData.get("imageOrder") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (
      !comicId ||
      !comicTitle ||
      !comicType ||
      !chapterNumber ||
      !imageOrder
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const comicIdNum = Number.parseInt(comicId, 10);
    const chapterNumberNum = Number.parseFloat(chapterNumber);
    const imageOrderNum = Number.parseInt(imageOrder, 10);

    if (!Number.isFinite(comicIdNum) || comicIdNum <= 0) {
      return NextResponse.json({ error: "Invalid comicId" }, { status: 400 });
    }
    if (!Number.isFinite(chapterNumberNum) || chapterNumberNum <= 0) {
      return NextResponse.json(
        { error: "Invalid chapterNumber" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(imageOrderNum) || imageOrderNum <= 0) {
      return NextResponse.json(
        { error: "Invalid imageOrder" },
        { status: 400 }
      );
    }

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
    // Format: /comic/[comic_type]/[comic_title]/[chapter_number]/[image_order].extension
    // Example: comic/manga/beck/01/001.jpg
    const s3Key = `comic/${comicType}/${sanitizedTitle}/${chapterNumber}/${imageOrder}.${fileExtension}`;

    // Check if this specific image already exists in S3
    try {
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
        })
      );

      return NextResponse.json(
        {
          error: `Image ${imageOrder} for chapter ${chapterNumber} already exists in S3`,
        },
        { status: 409 }
      );
    } catch (error: any) {
      // If error is not "NotFound", re-throw it
      if (error.name !== "NotFound") {
        throw error;
      }
      // If NotFound, continue with upload
    }

    // Get or create chapter record (allow multiple images per chapter)
    let chapterId: number;
    const existingChapter = await db
      .select({ chapterId: comicChapters.chapterId })
      .from(comicChapters)
      .where(
        and(
          eq(comicChapters.comicId, comicIdNum),
          eq(comicChapters.chapterNumber, chapterNumberNum)
        )
      )
      .limit(1);

    if (existingChapter.length > 0) {
      // Chapter already exists, use existing chapterId
      chapterId = existingChapter[0].chapterId;
    } else {
      // Chapter doesn't exist, create it
      const newChapter = await db
        .insert(comicChapters)
        .values({
          comicId: comicIdNum,
          chapterNumber: chapterNumberNum,
        })
        .returning({ chapterId: comicChapters.chapterId });
      chapterId = newChapter[0].chapterId;
    }

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
      process.env.S3_REGION || "us-east-1"
    }.amazonaws.com/${s3Key}`;

    // Create image record in database
    await db.insert(chapterImages).values({
      chapterId: chapterId,
      imageOrdering: imageOrderNum,
      imagePath: publicUrl,
    });

    return NextResponse.json({
      url: publicUrl,
      key: s3Key,
      chapterNumber: chapterNumberNum,
      imageOrder: imageOrderNum,
      comicId: comicIdNum,
    });
  } catch (error) {
    console.error("Chapter upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload chapter image" },
      { status: 500 }
    );
  }
}
