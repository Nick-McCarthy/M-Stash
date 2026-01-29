import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ebooks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import JSZip from "jszip";

// This route handles EPUB internal resource requests like META-INF/container.xml
// epubjs tries to load these relative to the page URL, so we intercept them here
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const { path } = resolvedParams;

    // Extract ebook ID from referer or URL
    const referer = request.headers.get("referer");
    const ebookIdMatch = referer?.match(/\/ebook-library\/(\d+)/);
    
    // Fallback: try to get from URL search params or path
    const url = new URL(request.url);
    const ebookIdParam = url.searchParams.get("ebookId");
    
    let ebookId: number | null = null;
    
    if (ebookIdMatch) {
      ebookId = parseInt(ebookIdMatch[1]);
    } else if (ebookIdParam) {
      ebookId = parseInt(ebookIdParam);
    }

    if (!ebookId || isNaN(ebookId)) {
      return NextResponse.json(
        { error: "Ebook ID not found in request" },
        { status: 400 }
      );
    }

    // Validate ebook ID parameter
    const validatedEbookId = z.coerce.number().int().positive().parse(ebookId);

    // Get ebook details
    const ebookResult = await db
      .select()
      .from(ebooks)
      .where(eq(ebooks.id, validatedEbookId))
      .limit(1);

    if (ebookResult.length === 0) {
      return NextResponse.json({ error: "Ebook not found" }, { status: 404 });
    }

    const ebookData = ebookResult[0];

    // If no path, return 404 (shouldn't happen for EPUB resources)
    if (!path || path.length === 0) {
      return NextResponse.json(
        { error: "Resource path not specified" },
        { status: 404 }
      );
    }

    // Join the path segments to get the internal EPUB file path
    const internalPath = path.join("/");

    // Fetch the EPUB file from S3
    const response = await fetch(ebookData.ebookAddress, {
      headers: {
        "User-Agent": "Media-Library-Server/1.0",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch ebook file" },
        { status: response.status }
      );
    }

    // Get the EPUB file as an array buffer
    const arrayBuffer = await response.arrayBuffer();

    // Unpack the EPUB using JSZip
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Get the requested file from the EPUB archive
    // Try multiple path variations for better compatibility
    let file = zip.file(internalPath);

    if (!file) {
      // Try without leading slash
      file = zip.file(internalPath.replace(/^\//, ""));
    }

    if (!file) {
      // Try with leading slash
      file = zip.file(`/${internalPath}`);
    }

    if (!file) {
      // Try with case-insensitive search (some EPUBs have inconsistent casing)
      const allFiles = Object.keys(zip.files);
      const matchingFile = allFiles.find(
        (f) =>
          f.toLowerCase() === internalPath.toLowerCase() ||
          f.toLowerCase() === `/${internalPath}`.toLowerCase() ||
          f.toLowerCase() === internalPath.replace(/^\//, "").toLowerCase()
      );
      if (matchingFile) {
        file = zip.file(matchingFile);
      }
    }

    // Handle missing files - some are optional (like Apple-specific metadata)
    if (!file) {
      console.warn(`File not found in EPUB (may be optional): ${internalPath}`);

      // Return empty XML response for optional metadata files (like Apple iBooks display options)
      // This prevents 404 errors for files that may not exist in all EPUBs
      if (
        internalPath.includes("META-INF") &&
        internalPath.includes("com.apple")
      ) {
        return new NextResponse(
          '<?xml version="1.0" encoding="UTF-8"?><display_options/>',
          {
            status: 200,
            headers: {
              "Content-Type": "application/xml",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
              "Cache-Control": "public, max-age=3600",
            },
          }
        );
      }

      // Return 404 for other missing files
      return NextResponse.json(
        { error: `File not found in EPUB: ${internalPath}` },
        { status: 404 }
      );
    }

    // Get the file content as a buffer
    const fileBuffer = await file.async("nodebuffer");

    return serveFile(fileBuffer, internalPath);
  } catch (error) {
    console.error("Error serving EPUB resource:", error);

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
        error: "Failed to serve EPUB resource",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

function serveFile(fileBuffer: Buffer, internalPath: string) {
  // Determine content type based on file extension
  let contentType = "application/octet-stream";
  const ext = internalPath.split(".").pop()?.toLowerCase();
  const contentTypes: Record<string, string> = {
    xml: "application/xml",
    opf: "application/oebps-package+xml",
    ncx: "application/x-dtbncx+xml",
    xhtml: "application/xhtml+xml",
    html: "text/html",
    css: "text/css",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    svg: "image/svg+xml",
    ttf: "font/ttf",
    otf: "font/otf",
    woff: "font/woff",
    woff2: "font/woff2",
  };

  if (ext && contentTypes[ext]) {
    contentType = contentTypes[ext];
  }

  // Return the file with appropriate headers.
  // Convert Buffer to a standalone ArrayBuffer for NextResponse typing compatibility.
  const body = Uint8Array.from(fileBuffer).buffer;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

