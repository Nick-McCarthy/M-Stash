import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tvShows, tvEpisodes, videoVersions } from "@/lib/db/schema";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { z } from "zod";

// Helper function to parse M3U8 playlist (same as movie upload)
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
      currentVariant = {};
      const paramsString = line.replace("#EXT-X-STREAM-INF:", "").trim();
      const params = paramsString.split(",").map((p) => p.trim());

      params.forEach((param) => {
        if (param.includes("=")) {
          const [key, value] = param.split("=").map((s) => s.trim());
          if (key === "RESOLUTION") {
            const [width, height] = value.split("x").map(Number);
            if (!isNaN(width) && !isNaN(height)) {
              currentVariant.width = width;
              currentVariant.height = height;
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
      currentVariant.playlistPath = line.trim();
      if (currentVariant.playlistPath) {
        variants.push(currentVariant);
      }
      currentVariant = null;
    }
  }

  return variants;
}

const s3Client = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_S3_BUCKET_NAME!;

export async function POST(request: NextRequest) {
  try {
    if (
      !BUCKET_NAME ||
      !process.env.S3_ACCESS_KEY_ID ||
      !process.env.S3_SECRET_ACCESS_KEY
    ) {
      return NextResponse.json(
        {
          error: "Server configuration error",
          details: "AWS credentials not configured",
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const tvShowId = formData.get("tv_show_id") as string;
    const seasonNumber = formData.get("season_number") as string;
    const episodeNumber = formData.get("episode_number") as string;
    const episodeTitle = formData.get("episode_title") as string;
    const spriteFile = formData.get("sprite") as File | null;
    const files = formData.getAll("files") as File[];
    const filePathsString = formData.get("filePaths") as string;
    const filePaths: string[] = filePathsString
      ? JSON.parse(filePathsString)
      : [];

    // Validate required fields
    if (!tvShowId || !seasonNumber || !episodeNumber || !episodeTitle) {
      return NextResponse.json(
        {
          error:
            "TV show ID, season number, episode number, and episode title are required",
        },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const tvShowIdNum = z.coerce.number().int().positive().parse(tvShowId);
    const seasonNum = z.coerce.number().int().positive().parse(seasonNumber);
    const episodeNum = z.coerce.number().int().positive().parse(episodeNumber);

    // Verify TV show exists
    const tvShowResult = await db
      .select()
      .from(tvShows)
      .where(eq(tvShows.tvShowId, tvShowIdNum))
      .limit(1);

    if (tvShowResult.length === 0) {
      return NextResponse.json({ error: "TV show not found" }, { status: 404 });
    }

    const tvShowTitle = tvShowResult[0].title;
    const sanitizedTitle = tvShowTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    // Create a map of file index to path
    const filePathMap = new Map<number, string>();
    files.forEach((file, index) => {
      const path = filePaths[index] || file.name;
      filePathMap.set(index, path);
    });

    // Find master.m3u8 file
    const masterPlaylistIndex = files.findIndex((file, index) => {
      const path = filePathMap.get(index) || file.name;
      return (
        file.name === "master.m3u8" ||
        path.endsWith("master.m3u8") ||
        path.includes("/master.m3u8")
      );
    });
    const masterPlaylistFile =
      masterPlaylistIndex >= 0 ? files[masterPlaylistIndex] : null;

    if (!masterPlaylistFile) {
      return NextResponse.json(
        { error: "master.m3u8 file not found in uploaded directory" },
        { status: 400 }
      );
    }

    // Find sprite if not separately uploaded
    let finalSpriteFile: File | null = spriteFile;
    let spriteIndex = -1;

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
    const basePath = `tv-show/${sanitizedTitle}/season-${seasonNum}/episode-${episodeNum}`;
    let masterPlaylistAddress = "";
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

    // Upload sprite if found
    if (finalSpriteFile) {
      const spriteExtension =
        finalSpriteFile.name.split(".").pop()?.toLowerCase() || "jpg";
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
      spriteAddress = masterPlaylistAddress; // Fallback
    }

    // Upload all other files maintaining directory structure
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (
        i === masterPlaylistIndex ||
        (spriteIndex >= 0 && i === spriteIndex)
      ) {
        continue;
      }

      const relativePath = filePathMap.get(i) || file.name;
      const pathParts = relativePath.split("/");
      const filePath =
        pathParts.length > 1 ? pathParts.slice(1).join("/") : file.name;

      const s3Key = `${basePath}/${filePath}`;
      const buffer = Buffer.from(await file.arrayBuffer());

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
      throw new Error(
        `Failed to parse master.m3u8: ${
          parseError instanceof Error
            ? parseError.message
            : "Unknown parsing error"
        }`
      );
    }

    // Create episode record
    let newEpisode;
    try {
      newEpisode = await db
        .insert(tvEpisodes)
        .values({
          tvShowId: tvShowIdNum,
          seasonNumber: seasonNum,
          episodeNumber: episodeNum,
          episodeTitle: episodeTitle.trim(),
          spriteAddress: spriteAddress || masterPlaylistAddress,
          masterPlaylistAddress,
        })
        .returning();
    } catch (dbError) {
      console.error("Database error creating episode:", dbError);
      throw new Error(
        `Failed to create episode record: ${
          dbError instanceof Error ? dbError.message : "Unknown database error"
        }`
      );
    }

    const episodeId = newEpisode[0].episodeId;

    // Create video version records for each resolution
    if (variants.length > 0) {
      try {
        const videoVersionPromises = variants.map((variant, index) => {
          const playlistRelativePath = variant.playlistPath;
          if (!playlistRelativePath) {
            throw new Error(`Variant ${index} has no playlist path`);
          }

          const playlistS3Key = `${basePath}/${playlistRelativePath}`;
          const playlistS3Url = `https://${BUCKET_NAME}.s3.${
            process.env.S3_REGION || "us-east-1"
          }.amazonaws.com/${playlistS3Key}`;

          const playlistDir = playlistRelativePath
            .split("/")
            .slice(0, -1)
            .join("/");
          const basePathForVersion = playlistDir
            ? `${basePath}/${playlistDir}`
            : basePath;

          return db.insert(videoVersions).values({
            tvEpisodeId: episodeId,
            versionNumber: `v${index}`,
            resolution: variant.resolution || null,
            basePath: basePathForVersion,
            playlistPath: playlistS3Url,
            bandwidth: variant.bandwidth || null,
            width: variant.width || null,
            height: variant.height || null,
            isDefault: index === 0,
          });
        });

        await Promise.all(videoVersionPromises);
      } catch (versionError) {
        console.error("Error creating video versions:", versionError);
        console.warn(
          "Episode created but video versions failed. Episode ID:",
          episodeId
        );
      }
    }

    return NextResponse.json(
      {
        episode_id: episodeId,
        tv_show_id: tvShowIdNum,
        season_number: seasonNum,
        episode_number: episodeNum,
        episode_title: episodeTitle,
        master_playlist_address: masterPlaylistAddress,
        sprite_address: spriteAddress,
        variants_created: variants.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error uploading episode:", error);

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
        error: "Failed to upload episode",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
