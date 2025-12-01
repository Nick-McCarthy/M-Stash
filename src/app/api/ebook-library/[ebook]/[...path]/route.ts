import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ebooks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import JSZip from "jszip";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ebook: string; path?: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const { ebook, path } = resolvedParams;

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

    // If no path, return the full EPUB file (fallback to main proxy route)
    if (!path || path.length === 0) {
      // This shouldn't happen, but handle it gracefully
      return NextResponse.redirect(`/api/ebook-library/${ebookId}/proxy`);
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
        (f) => f.toLowerCase() === internalPath.toLowerCase() || 
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
      if (internalPath.includes("META-INF") && internalPath.includes("com.apple")) {
        return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><display_options/>', {
          status: 200,
          headers: {
            "Content-Type": "application/xml",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Cache-Control": "public, max-age=3600",
          },
        });
      }
      
      // Return 404 for other missing files
      return NextResponse.json(
        { error: `File not found in EPUB: ${internalPath}` },
        { status: 404 }
      );
    }

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

    // Get the file content as a buffer
    const fileBuffer = await file.async("nodebuffer");

    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "public, max-age=3600",
      },
    });
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

