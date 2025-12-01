import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ebooks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ebook: string }> }
) {
  try {
    const { ebook } = await params;

    // Validate ebook ID parameter
    const ebookId = z.coerce.number().int().positive().parse(ebook);

    // Get ebook details
    const ebookResult = await db
      .select()
      .from(ebooks)
      .where(eq(ebooks.id, ebookId))
      .limit(1);

    if (ebookResult.length === 0) {
      return NextResponse.json({ error: "Ebook not found" }, { status: 404 });
    }

    const ebookData = ebookResult[0];

    // Check for Range header (for partial content requests)
    const range = request.headers.get("range");

    // Prepare headers for S3 request
    const s3Headers: Record<string, string> = {
      "User-Agent": "Media-Library-Server/1.0",
    };

    // Forward Range header to S3 if present
    if (range) {
      s3Headers["Range"] = range;
    }

    // Fetch the EPUB file from S3
    const response = await fetch(ebookData.ebookAddress, {
      headers: s3Headers,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch ebook file" },
        { status: response.status }
      );
    }

    // Get response headers
    const contentType = response.headers.get("content-type") || "application/epub+zip";
    const contentLength = response.headers.get("content-length");
    const contentRange = response.headers.get("content-range");
    const acceptRanges = response.headers.get("accept-ranges") || "bytes";

    // Get the file as an array buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Prepare response headers
    const responseHeaders: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(ebookData.ebookTitle)}.epub"`,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type",
      "Accept-Ranges": acceptRanges,
      "Cache-Control": "public, max-age=3600",
    };

    // Add content length if available
    if (contentLength) {
      responseHeaders["Content-Length"] = contentLength;
    }

    // Handle partial content (206 status)
    if (range && contentRange) {
      responseHeaders["Content-Range"] = contentRange;
      return new NextResponse(buffer, {
        status: 206, // Partial Content
        headers: responseHeaders,
      });
    }

    // Return full file
    return new NextResponse(buffer, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Error proxying ebook:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid ebook ID",
          details: error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join(", "),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to proxy ebook",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type",
      "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
    },
  });
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ ebook: string }> }
) {
  try {
    const { ebook } = await params;
    const ebookId = z.coerce.number().int().positive().parse(ebook);

    const ebookResult = await db
      .select()
      .from(ebooks)
      .where(eq(ebooks.id, ebookId))
      .limit(1);

    if (ebookResult.length === 0) {
      return new NextResponse(null, { status: 404 });
    }

    const ebookData = ebookResult[0];

    // Fetch HEAD request from S3 to get file metadata
    const response = await fetch(ebookData.ebookAddress, {
      method: "HEAD",
      headers: {
        "User-Agent": "Media-Library-Server/1.0",
      },
    });

    if (!response.ok) {
      return new NextResponse(null, { status: response.status });
    }

    const contentLength = response.headers.get("content-length");
    const contentType = response.headers.get("content-type") || "application/epub+zip";

    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": contentLength || "0",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Range, Content-Type",
        "Accept-Ranges": "bytes",
      },
    });
  } catch (error) {
    console.error("Error in HEAD request:", error);
    return new NextResponse(null, { status: 500 });
  }
}

