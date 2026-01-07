#!/usr/bin/env tsx

/**
 * Standalone Video to HLS Converter Script
 * 
 * Converts a video file into HLS format with multiple resolutions
 * suitable for upload to the M-Stash video directory upload form.
 * 
 * Requirements:
 *   - Node.js with tsx: npm install -g tsx
 *   - ffmpeg-static: npm install ffmpeg-static
 *     OR have ffmpeg installed on your system
 * 
 * Usage:
 *   tsx convert-video-to-hls-standalone.ts <input-video> [output-directory]
 * 
 * Example:
 *   tsx convert-video-to-hls-standalone.ts movie.mp4
 *   tsx convert-video-to-hls-standalone.ts movie.mp4 my-movie-output
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, basename, extname } from "path";

// Try to import ffmpeg-static, fallback to system ffmpeg
let ffmpegPath: string | null = null;
try {
  const ffmpegStatic = require("ffmpeg-static");
  ffmpegPath = ffmpegStatic;
} catch {
  // Try system ffmpeg
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
    ffmpegPath = "ffmpeg";
  } catch {
    console.error("Error: ffmpeg not found. Please install ffmpeg-static or have ffmpeg in your PATH.");
    process.exit(1);
  }
}

// Resolution configurations
const RESOLUTIONS = [
  { name: "1080", height: 1080, bitrate: "5000k", audioBitrate: "192k" },
  { name: "720", height: 720, bitrate: "2800k", audioBitrate: "128k" },
  { name: "480", height: 480, bitrate: "1400k", audioBitrate: "96k" },
] as const;

interface VideoInfo {
  width: number;
  height: number;
  duration: number;
}

function getVideoInfo(videoPath: string): VideoInfo {
  try {
    // Try JSON output first (works with ffmpeg-static)
    const command = `"${ffmpegPath}" -v error -select_streams v:0 -show_entries stream=width,height -show_entries format=duration -of json "${videoPath}"`;
    const output = execSync(command, { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] });
    const data = JSON.parse(output);
    
    const width = parseInt(data.streams?.[0]?.width || "1920");
    const height = parseInt(data.streams?.[0]?.height || "1080");
    const duration = parseFloat(data.format?.duration || "0");
    
    return { width, height, duration };
  } catch (error) {
    // Fallback: parse from stderr output
    try {
      const command = `"${ffmpegPath}" -i "${videoPath}" 2>&1`;
      const output = execSync(command, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
      
      // Parse resolution from output like: "Stream #0:0: Video: h264, yuv420p, 1920x1080..."
      const resolutionMatch = output.match(/(\d+)x(\d+)/);
      const width = resolutionMatch ? parseInt(resolutionMatch[1]) : 1920;
      const height = resolutionMatch ? parseInt(resolutionMatch[2]) : 1080;
      
      // Parse duration from output like: "Duration: 01:23:45.67"
      const durationMatch = output.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}\.\d+)/);
      let duration = 0;
      if (durationMatch) {
        const hours = parseInt(durationMatch[1]);
        const minutes = parseInt(durationMatch[2]);
        const seconds = parseFloat(durationMatch[3]);
        duration = hours * 3600 + minutes * 60 + seconds;
      }
      
      return { width, height, duration };
    } catch (fallbackError) {
      console.error("Error getting video info:", error);
      // Return defaults
      return { width: 1920, height: 1080, duration: 0 };
    }
  }
}

function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function createMasterPlaylist(
  outputDir: string,
  resolutions: typeof RESOLUTIONS,
  videoInfo: VideoInfo
): void {
  const masterPlaylistPath = join(outputDir, "master.m3u8");
  let masterContent = "#EXTM3U\n#EXT-X-VERSION:3\n\n";

  // Only include resolutions that are smaller than or equal to the source video
  const validResolutions = resolutions.filter(
    (res) => res.height <= videoInfo.height
  );

  validResolutions.forEach((res) => {
    const bandwidth = res.bitrate.replace("k", "000");
    // Calculate width maintaining aspect ratio
    const width = Math.round((res.height * videoInfo.width) / videoInfo.height);
    const adjustedWidth = width % 2 === 0 ? width : width - 1;
    const resolution = `${adjustedWidth}x${res.height}`;
    
    masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${resolution}\n`;
    masterContent += `${res.name}/playlist.m3u8\n\n`;
  });

  writeFileSync(masterPlaylistPath, masterContent, "utf-8");
  console.log(`✓ Created master playlist: ${masterPlaylistPath}`);
}

function convertToHLS(
  inputPath: string,
  outputDir: string,
  resolution: typeof RESOLUTIONS[number],
  videoInfo: VideoInfo
): void {
  const resDir = join(outputDir, resolution.name);
  if (!existsSync(resDir)) {
    mkdirSync(resDir, { recursive: true });
  }

  const playlistPath = join(resDir, "playlist.m3u8");
  const segmentPattern = join(resDir, "segment%03d.ts");

  // Skip if resolution is higher than source
  if (resolution.height > videoInfo.height) {
    console.log(`⚠ Skipping ${resolution.name}p (source is ${videoInfo.height}p)`);
    return;
  }

  console.log(`\n📹 Converting to ${resolution.name}p...`);

  // Calculate width maintaining aspect ratio
  const width = Math.round((resolution.height * videoInfo.width) / videoInfo.height);
  // Ensure width is even (required by some codecs)
  const adjustedWidth = width % 2 === 0 ? width : width - 1;

  const ffmpegCommand = [
    `"${ffmpegPath}"`,
    "-i", `"${inputPath}"`,
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "23",
    "-sc_threshold", "0",
    "-g", "48",
    "-keyint_min", "48",
    "-hls_time", "10",
    "-hls_playlist_type", "vod",
    "-hls_segment_filename", `"${segmentPattern}"`,
    "-b:v", resolution.bitrate,
    "-maxrate", resolution.bitrate,
    "-bufsize", `${parseInt(resolution.bitrate) * 2}k`,
    "-vf", `scale=${adjustedWidth}:${resolution.height}:force_original_aspect_ratio=decrease,pad=${adjustedWidth}:${resolution.height}:(ow-iw)/2:(oh-ih)/2`,
    "-c:a", "aac",
    "-b:a", resolution.audioBitrate,
    "-ac", "2",
    "-ar", "48000",
    "-hls_segment_type", "mpegts",
    "-hls_flags", "independent_segments",
    `"${playlistPath}"`,
  ].join(" ");

  try {
    console.log(`   Running: ffmpeg (this may take a while...)`);
    execSync(ffmpegCommand, { stdio: "inherit" });
    console.log(`✓ Completed ${resolution.name}p conversion`);
  } catch (error) {
    console.error(`✗ Error converting ${resolution.name}p:`, error);
    throw error;
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: tsx convert-video-to-hls-standalone.ts <input-video> [output-directory]");
    console.error("\nExample:");
    console.error("  tsx convert-video-to-hls-standalone.ts movie.mp4");
    console.error("  tsx convert-video-to-hls-standalone.ts movie.mp4 my-movie-output");
    process.exit(1);
  }

  const inputPath = args[0];
  const outputName = args[1] || sanitizeName(basename(inputPath, extname(inputPath)));

  // Check if input file exists
  if (!existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  // Create output directory
  const outputDir = join(process.cwd(), outputName);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  console.log(`\n🎬 Video to HLS Converter`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Input:  ${inputPath}`);
  console.log(`Output: ${outputDir}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Get video information
  console.log("📊 Analyzing video...");
  const videoInfo = getVideoInfo(inputPath);
  console.log(`   Resolution: ${videoInfo.width}x${videoInfo.height}`);
  console.log(`   Duration: ${videoInfo.duration.toFixed(2)}s\n`);

  // Convert to each resolution
  for (const resolution of RESOLUTIONS) {
    try {
      convertToHLS(inputPath, outputDir, resolution, videoInfo);
    } catch (error) {
      console.error(`Failed to convert ${resolution.name}p, continuing...`);
    }
  }

  // Create master playlist
  console.log("\n📝 Creating master playlist...");
  createMasterPlaylist(outputDir, RESOLUTIONS, videoInfo);

  console.log(`\n✅ Conversion complete!`);
  console.log(`\n📁 Output directory: ${outputDir}`);
  console.log(`\nYou can now upload this directory using the "Upload Video Directory" form.`);
  console.log(`\nDirectory structure:`);
  console.log(`  ${outputName}/`);
  console.log(`  ├── master.m3u8`);
  RESOLUTIONS.forEach((res) => {
    if (res.height <= videoInfo.height) {
      console.log(`  ├── ${res.name}/`);
      console.log(`  │   ├── playlist.m3u8`);
      console.log(`  │   └── segment*.ts`);
    }
  });
}

main();

