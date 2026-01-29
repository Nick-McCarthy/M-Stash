import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ebooks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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
    const file = formData.get("ebook_file") as File;
    const ebookTitle = formData.get("ebook_title") as string;
    const ebookAuthor = formData.get("ebook_author") as string;

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: "Ebook file is required" },
        { status: 400 }
      );
    }

    if (!ebookTitle || !ebookAuthor) {
      return NextResponse.json(
        { error: "Ebook title and author are required" },
        { status: 400 }
      );
    }

    // Get file extension
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    if (
      !fileExtension ||
      !["epub", "pdf", "mobi", "azw", "azw3"].includes(fileExtension)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only EPUB, PDF, MOBI, AZW, and AZW3 are allowed.",
        },
        { status: 400 }
      );
    }

    // Sanitize the ebook title and author for use in file path
    const sanitizedTitle = ebookTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    const sanitizedAuthor = ebookAuthor
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    // Create the S3 key with the desired folder structure
    // Format: /ebook/[author]/[title].[file_extension]
    const s3Key = `ebook/${sanitizedAuthor}/${sanitizedTitle}.${fileExtension}`;

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: file.type || `application/${fileExtension}`,
    });

    await s3Client.send(command);

    // Construct the public URL
    const publicUrl = `https://${BUCKET_NAME}.s3.${
      process.env.S3_REGION || "us-east-1"
    }.amazonaws.com/${s3Key}`;

    // Check if ebook with same title and author already exists
    const existingEbook = await db
      .select()
      .from(ebooks)
      .where(
        and(
          eq(ebooks.ebookTitle, ebookTitle),
          eq(ebooks.ebookAuthor, ebookAuthor)
        )
      )
      .limit(1);

    if (existingEbook.length > 0) {
      return NextResponse.json(
        { error: "An ebook with this title and author already exists" },
        { status: 409 }
      );
    }

    // Insert ebook into database
    const newEbook = await db
      .insert(ebooks)
      .values({
        ebookTitle: ebookTitle,
        ebookAuthor: ebookAuthor,
        ebookAddress: publicUrl,
      })
      .returning();

    return NextResponse.json(
      {
        id: newEbook[0].id,
        title: newEbook[0].ebookTitle,
        author: newEbook[0].ebookAuthor,
        address: newEbook[0].ebookAddress,
        s3Key: s3Key,
        ebookUrl: publicUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating ebook:", error);

    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes("unique constraint")) {
      return NextResponse.json(
        { error: "An ebook with this title and author already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create ebook",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
