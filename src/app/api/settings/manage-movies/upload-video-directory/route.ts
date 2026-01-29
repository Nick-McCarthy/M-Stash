import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { movies, videoVersions } from "@/lib/db/schema";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { stringifyJsonArray } from "@/lib/db/sqlite-helpers";
import { z } from "zod";
import { readFileSync } from "fs";
import { join } from "path";

// Try to read bucket name from config file as fallback
let configBucketName: string | undefined;
try {
  const configPath = join(process.cwd(), "config", "s3-config.json");
  const config = JSON.parse(readFileSync(configPath, "utf-8"));
  configBucketName = config.bucketName;
} catch {
  // Config file doesn't exist or can't be read, that's okay
}

// Validate required environment variables
const S3_REGION = process.env.S3_REGION || "us-east-1";
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.S3_BUCKET_NAME || configBucketName;

if (!S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
  console.error("Missing AWS credentials. Please set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY environment variables.");
}

if (!BUCKET_NAME) {
  console.error("Missing AWS S3 bucket name. Please set S3_BUCKET_NAME environment variable.");
}

const s3Client = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID!,
    secretAccessKey: S3_SECRET_ACCESS_KEY!,
  },
});

// Helper function to parse M3U8 playlist
function parseM3U8(content: string) {
  const lines = content.split("\n").filter((line) => line.trim());
  const variants: Array<{
    resolution?: number;
    bandwidth?: number;
    width?: number;
    height?: number;
    playlistPath: string;
  }> = [];

  let currentVariant: any = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("#EXT-X-STREAM-INF:")) {
      // Parse variant stream info
      currentVariant = {};
      // Handle both comma-separated and space-separated params
      const paramsString = line.replace("#EXT-X-STREAM-INF:", "").trim();
      // Split by comma first, then handle individual key=value pairs
      const params = paramsString.split(",").map(p => p.trim());

      params.forEach((param) => {
        if (param.includes("=")) {
          const [key, value] = param.split("=").map((s) => s.trim());
          if (key === "RESOLUTION") {
            const [width, height] = value.split("x").map(Number);
            if (!isNaN(width) && !isNaN(height)) {
              currentVariant.width = width;
              currentVariant.height = height;
              // Extract resolution number (e.g., 1080, 720, 480)
              currentVariant.resolution = height;
            }
          } else if (key === "BANDWIDTH") {
            const bandwidth = parseInt(value, 10);
            if (!isNaN(bandwidth)) {
              currentVariant.bandwidth = bandwidth;
            }
          }
        }
      });
    } else if (line && !line.startsWith("#") && currentVariant) {
      // This is the playlist path
      currentVariant.playlistPath = line.trim();
      if (currentVariant.playlistPath) {
        variants.push(currentVariant);
      }
      currentVariant = null;
    }
  }

  return variants;
}

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables before processing
    if (!BUCKET_NAME) {
      return NextResponse.json(
        {
          error: "Server configuration error",
          details: "S3_BUCKET_NAME environment variable is not set. Please configure the S3 bucket name.",
        },
        { status: 500 }
      );
    }

    if (!S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
      return NextResponse.json(
        {
          error: "Server configuration error",
          details: "AWS credentials are not configured. Please set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY environment variables.",
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const title = formData.get("title") as string;
    const tagsString = formData.get("tags") as string;
    const genresString = formData.get("genres") as string;
    const thumbnailFile = formData.get("thumbnail") as File | null;
    const spriteFile = formData.get("sprite") as File | null;
    const files = formData.getAll("files") as File[];
    const filePathsString = formData.get("filePaths") as string;
    const filePaths: string[] = filePathsString ? JSON.parse(filePathsString) : [];

    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { error: "Movie title is required" },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
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

    // Create a map of file index to path for easier lookup
    const filePathMap = new Map<number, string>();
    files.forEach((file, index) => {
      const path = filePaths[index] || file.name;
      filePathMap.set(index, path);
    });

    // Find master.m3u8 file
    const masterPlaylistIndex = files.findIndex(
      (file, index) => {
        const path = filePathMap.get(index) || file.name;
        return (
          file.name === "master.m3u8" ||
          path.endsWith("master.m3u8") ||
          path.includes("/master.m3u8")
        );
      }
    );
    const masterPlaylistFile = masterPlaylistIndex >= 0 ? files[masterPlaylistIndex] : null;

    if (!masterPlaylistFile) {
      return NextResponse.json(
        { error: "master.m3u8 file not found in uploaded directory" },
        { status: 400 }
      );
    }

    // Use separately uploaded thumbnail/sprite if provided, otherwise look in directory
    let finalThumbnailFile: File | null = thumbnailFile;
    let thumbnailIndex = -1;
    let finalSpriteFile: File | null = spriteFile;
    let spriteIndex = -1;

    // If not provided separately, look for thumbnail in directory
    if (!finalThumbnailFile) {
      thumbnailIndex = files.findIndex((f, index) => {
        const path = filePathMap.get(index) || f.name;
        return (
          f.name.match(/^(thumbnail|thumb|poster)\.(jpg|jpeg|png|webp)$/i) ||
          path.match(/thumbnail\.(jpg|jpeg|png|webp)$/i)
        );
      });
      finalThumbnailFile = thumbnailIndex >= 0 ? files[thumbnailIndex] : null;
    }

    // If not provided separately, look for sprite in directory
    if (!finalSpriteFile) {
      spriteIndex = files.findIndex((f, index) => {
        const path = filePathMap.get(index) || f.name;
        return (
          f.name.match(/^sprite(s)?\.(jpg|jpeg|png)$/i) ||
          path.match(/sprite(s)?\.(jpg|jpeg|png)$/i)
        );
      });
      finalSpriteFile = spriteIndex >= 0 ? files[spriteIndex] : null;
    }

    // Upload all files to S3
    const basePath = `movie/${sanitizedTitle}`;
    let masterPlaylistAddress = "";
    let thumbnailAddress = "";
    let spriteAddress = "";

    // Upload master.m3u8 first
    const masterPlaylistContent = await masterPlaylistFile.text();
    const masterPlaylistS3Key = `${basePath}/master.m3u8`;
    const masterPlaylistBuffer = Buffer.from(masterPlaylistContent);

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: masterPlaylistS3Key,
        Body: masterPlaylistBuffer,
        ContentType: "application/vnd.apple.mpegurl",
      })
    );

    masterPlaylistAddress = `https://${BUCKET_NAME}.s3.${
      process.env.S3_REGION || "us-east-1"
    }.amazonaws.com/${masterPlaylistS3Key}`;

    // Upload thumbnail if found (placed at root level next to master.m3u8)
    if (finalThumbnailFile) {
      const thumbnailExtension = finalThumbnailFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const thumbnailS3Key = `${basePath}/thumbnail.${thumbnailExtension}`;
      const thumbnailBuffer = Buffer.from(await finalThumbnailFile.arrayBuffer());

      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: thumbnailS3Key,
          Body: thumbnailBuffer,
          ContentType: finalThumbnailFile.type,
        })
      );

      thumbnailAddress = `https://${BUCKET_NAME}.s3.${
        process.env.S3_REGION || "us-east-1"
      }.amazonaws.com/${thumbnailS3Key}`;
    } else {
      // Use a placeholder or default thumbnail
      thumbnailAddress = masterPlaylistAddress; // Fallback, should be replaced with actual thumbnail
    }

    // Upload sprite if found (placed at root level next to master.m3u8)
    if (finalSpriteFile) {
      const spriteExtension = finalSpriteFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const spriteS3Key = `${basePath}/sprite.${spriteExtension}`;
      const spriteBuffer = Buffer.from(await finalSpriteFile.arrayBuffer());

      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: spriteS3Key,
          Body: spriteBuffer,
          ContentType: finalSpriteFile.type,
        })
      );

      spriteAddress = `https://${BUCKET_NAME}.s3.${
        process.env.S3_REGION || "us-east-1"
      }.amazonaws.com/${spriteS3Key}`;
    } else {
      // Use a placeholder or default sprite
      spriteAddress = masterPlaylistAddress; // Fallback, should be replaced with actual sprite
    }

    // Upload all other files maintaining directory structure
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Skip files we've already uploaded
      // Only skip if they were found in the directory (not separately uploaded)
      if (
        i === masterPlaylistIndex ||
        (thumbnailIndex >= 0 && i === thumbnailIndex) ||
        (spriteIndex >= 0 && i === spriteIndex)
      ) {
        continue;
      }

      // Get relative path from filePathMap or use file name
      const relativePath = filePathMap.get(i) || file.name;
      
      // Remove the root directory name if present (e.g., "video-name/master.m3u8" -> "master.m3u8")
      const pathParts = relativePath.split("/");
      const filePath = pathParts.length > 1 ? pathParts.slice(1).join("/") : file.name;
      
      const s3Key = `${basePath}/${filePath}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      // Determine content type
      let contentType = file.type || "application/octet-stream";
      if (file.name.endsWith(".m3u8")) {
        contentType = "application/vnd.apple.mpegurl";
      } else if (file.name.endsWith(".ts")) {
        contentType = "video/mp2t";
      }

      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
          Body: buffer,
          ContentType: contentType,
        })
      );
    }

    // Parse master playlist to get variant information
    let variants;
    try {
      variants = parseM3U8(masterPlaylistContent);
      console.log(`Parsed ${variants.length} variants from master.m3u8`);
    } catch (parseError) {
      console.error("Error parsing master.m3u8:", parseError);
      console.error("Master playlist content (first 1000 chars):", masterPlaylistContent.substring(0, 1000));
      throw new Error(`Failed to parse master.m3u8: ${parseError instanceof Error ? parseError.message : "Unknown parsing error"}`);
    }

    if (variants.length === 0) {
      console.warn("No variants found in master.m3u8. Master playlist content:", masterPlaylistContent.substring(0, 500));
    }

    // Create movie record
    let newMovie;
    try {
      newMovie = await db
        .insert(movies)
        .values({
          title,
          thumbnailAddress: thumbnailAddress || masterPlaylistAddress,
          spriteAddress: spriteAddress || masterPlaylistAddress,
          masterPlaylistAddress,
          tags: stringifyJsonArray(tags),
          genres: stringifyJsonArray(genres),
        })
        .returning();
    } catch (dbError) {
      console.error("Database error creating movie:", dbError);
      throw new Error(`Failed to create movie record: ${dbError instanceof Error ? dbError.message : "Unknown database error"}`);
    }

    const movieId = newMovie[0].movieId;

    // Create video version records for each resolution
    if (variants.length > 0) {
      try {
        const videoVersionPromises = variants.map((variant, index) => {
          // Construct the full S3 URL for the playlist
          // The playlist path in master.m3u8 is relative to the master.m3u8 location
          const playlistRelativePath = variant.playlistPath;
          if (!playlistRelativePath) {
            throw new Error(`Variant ${index} has no playlist path`);
          }
          
          const playlistS3Key = `${basePath}/${playlistRelativePath}`;
          const playlistS3Url = `https://${BUCKET_NAME}.s3.${
            process.env.S3_REGION || "us-east-1"
          }.amazonaws.com/${playlistS3Key}`;

          // Determine base path (directory containing the playlist)
          const playlistDir = playlistRelativePath.split("/").slice(0, -1).join("/");
          const basePathForVersion = playlistDir
            ? `${basePath}/${playlistDir}`
            : basePath;

          return db.insert(videoVersions).values({
            movieId,
            versionNumber: `v${index}`,
            resolution: variant.resolution || null,
            basePath: basePathForVersion,
            playlistPath: playlistS3Url,
            bandwidth: variant.bandwidth || null,
            width: variant.width || null,
            height: variant.height || null,
            isDefault: index === 0, // First variant is default
          });
        });

        await Promise.all(videoVersionPromises);
      } catch (versionError) {
        console.error("Error creating video versions:", versionError);
        // Don't fail the entire upload if versions fail - movie is already created
        console.warn("Movie created but video versions failed. Movie ID:", movieId);
      }
    } else {
      console.warn("No video versions created - no variants found in master.m3u8");
    }

    return NextResponse.json(
      {
        movie_id: movieId,
        title: newMovie[0].title,
        thumbnail_address: newMovie[0].thumbnailAddress,
        sprite_address: newMovie[0].spriteAddress,
        master_playlist_address: newMovie[0].masterPlaylistAddress,
        tags,
        genres,
        variants_created: variants.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error uploading video directory:", error);
    
    // Log full error details for debugging
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

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

    // Handle AWS-specific errors
    if (error instanceof Error) {
      // Check for AWS signature errors
      if (error.name === "SignatureDoesNotMatch" || error.message.includes("signature")) {
        return NextResponse.json(
          {
            error: "AWS Authentication Error",
            details: "The AWS credentials are incorrect or expired. Please check:\n" +
              "1. S3_ACCESS_KEY_ID is correct\n" +
              "2. S3_SECRET_ACCESS_KEY matches the access key\n" +
              "3. Credentials have not expired\n" +
              "4. Credentials have permission to upload to the S3 bucket",
          },
          { status: 500 }
        );
      }

      // Check for other AWS errors
      if (error.name.includes("AWS") || error.message.includes("AWS")) {
        return NextResponse.json(
          {
            error: "AWS Service Error",
            details: error.message,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Failed to upload video directory",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

