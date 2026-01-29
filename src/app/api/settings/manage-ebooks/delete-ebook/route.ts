import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ebooks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ebookId = searchParams.get("id");

    if (!ebookId) {
      return NextResponse.json(
        { error: "Ebook ID is required" },
        { status: 400 }
      );
    }

    const ebookIdNum = parseInt(ebookId, 10);
    if (isNaN(ebookIdNum)) {
      return NextResponse.json({ error: "Invalid ebook ID" }, { status: 400 });
    }

    // Get the ebook to retrieve the S3 key
    const ebook = await db
      .select()
      .from(ebooks)
      .where(eq(ebooks.id, ebookIdNum))
      .limit(1);

    if (ebook.length === 0) {
      return NextResponse.json({ error: "Ebook not found" }, { status: 404 });
    }

    // Extract S3 key from the ebook address
    const ebookAddress = ebook[0].ebookAddress;
    const s3KeyMatch = ebookAddress.match(/https:\/\/[^/]+\/(.+)$/);

    // Delete from S3 if we can extract the key
    if (s3KeyMatch && s3KeyMatch[1]) {
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3KeyMatch[1],
        });
        await s3Client.send(deleteCommand);
      } catch (s3Error) {
        console.error("Error deleting from S3:", s3Error);
        // Continue with database deletion even if S3 deletion fails
      }
    }

    // Delete from database
    await db.delete(ebooks).where(eq(ebooks.id, ebookIdNum));

    return NextResponse.json(
      { message: "Ebook deleted successfully", id: ebookIdNum },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting ebook:", error);

    return NextResponse.json(
      {
        error: "Failed to delete ebook",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
