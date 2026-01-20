"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { MovieSchema, type Movie } from "@/lib/schemas/movies";
import { z } from "zod";

// Dynamically import ReactPlayer to avoid SSR issues
const ReactPlayer = dynamic(() => import("react-player"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-white">
      Loading player...
    </div>
  ),
});

async function fetchMovie(id: number): Promise<Movie> {
  const response = await fetch(`/api/movie-library/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch movie");
  }
  const data = await response.json();
  return MovieSchema.parse(data);
}

export default function MoviePlayer() {
  const params = useParams();
  const router = useRouter();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playerMounted, setPlayerMounted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Ensure player only mounts on client side
    if (typeof window !== "undefined") {
      setPlayerMounted(true);
      console.log("Player component mounted");
    }
  }, []);

  // Handle mouse movement to show/hide controls
  const handleMouseMove = useCallback(() => {
    setShowControls(true);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Hide controls after 1 second of inactivity
    timeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 1000);
  }, []);

  // Set up mouse movement detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseenter", handleMouseMove);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseenter", handleMouseMove);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleMouseMove]);

  // Track movie view with cooldown
  useEffect(() => {
    if (typeof window === "undefined" || !movie) {
      return;
    }

    const cooldownMs = 20 * 60 * 1000; // 20 minutes
    const storageKey = "ml-movie-view-timestamps";

    const recordView = async () => {
      const now = Date.now();
      const movieId = movie.movie_id;

      try {
        const stored = window.localStorage.getItem(storageKey);
        const timestamps: Record<string, number> = stored
          ? JSON.parse(stored)
          : {};
        const lastViewed = timestamps[String(movieId)] ?? 0;

        if (now - lastViewed < cooldownMs) {
          return;
        }

        const response = await fetch(
          `/api/movie-library/${movieId}/views`,
          { method: "POST" }
        );

        if (!response.ok) {
          console.error(
            "Failed to record movie view",
            await response.json().catch(() => undefined)
          );
          return;
        }

        timestamps[String(movieId)] = now;
        window.localStorage.setItem(storageKey, JSON.stringify(timestamps));
      } catch (error) {
        console.error("Error tracking movie view", error);
      }
    };

    void recordView();
  }, [movie]);

  useEffect(() => {
    const loadMovie = async () => {
      try {
        setLoading(true);
        setError(null);
        const movieId = z.coerce.number().int().positive().parse(params.movie);
        const movieData = await fetchMovie(movieId);
        console.log("Movie data loaded:", movieData);
        console.log("Video URL:", movieData.video_address);

        // Test if the video URL is accessible
        try {
          const testResponse = await fetch(movieData.video_address, {
            method: "HEAD",
          });
          console.log("Video URL accessibility test:", {
            status: testResponse.status,
            statusText: testResponse.statusText,
            headers: Object.fromEntries(testResponse.headers.entries()),
          });
          if (!testResponse.ok) {
            console.warn(
              "Video URL returned non-OK status:",
              testResponse.status
            );
          }

          // Fetch and log master playlist content for debugging
          try {
            const playlistResponse = await fetch(movieData.video_address);
            const playlistContent = await playlistResponse.text();
            console.log("📋 Master playlist content:", playlistContent);
            console.log(
              "📋 Master playlist lines:",
              playlistContent.split("\n").filter((line) => line.trim())
            );

            // Extract resolution playlist path from master playlist
            const resolutionPlaylistMatch = playlistContent.match(
              /^(\d+\/playlist\.m3u8)$/m
            );
            if (resolutionPlaylistMatch) {
              const resolutionPlaylistPath = resolutionPlaylistMatch[1];
              // Construct full URL for resolution playlist
              const masterPlaylistUrl = new URL(movieData.video_address);
              const resolutionPlaylistUrl = new URL(
                resolutionPlaylistPath,
                movieData.video_address
              );
              console.log(
                "📋 Resolution playlist URL:",
                resolutionPlaylistUrl.toString()
              );

              // Test if resolution playlist is accessible
              try {
                const resPlaylistResponse = await fetch(
                  resolutionPlaylistUrl.toString()
                );
                const resPlaylistContent = await resPlaylistResponse.text();
                console.log(
                  "📋 Resolution playlist accessible:",
                  resPlaylistResponse.status
                );

                // Extract first segment path
                const firstSegmentMatch =
                  resPlaylistContent.match(/^segment\d+\.ts$/m);
                if (firstSegmentMatch) {
                  const firstSegment = firstSegmentMatch[0];
                  const segmentUrl = new URL(
                    firstSegment,
                    resolutionPlaylistUrl.toString()
                  );
                  console.log("📋 First segment URL:", segmentUrl.toString());

                  // Test if first segment is accessible (this will reveal CORS issues)
                  fetch(segmentUrl.toString(), { method: "HEAD" })
                    .then((segmentResponse) => {
                      console.log(
                        "✅ First segment accessible:",
                        segmentResponse.status,
                        segmentResponse.statusText
                      );
                      console.log(
                        "📋 Segment headers:",
                        Object.fromEntries(segmentResponse.headers.entries())
                      );
                    })
                    .catch((segmentError) => {
                      console.error(
                        "❌ First segment NOT accessible:",
                        segmentError
                      );
                      console.error(
                        "This is likely a CORS issue. Check your S3 bucket CORS configuration."
                      );
                    });
                }
              } catch (resPlaylistError) {
                console.warn(
                  "Could not fetch resolution playlist:",
                  resPlaylistError
                );
              }
            }
          } catch (playlistError) {
            console.warn(
              "Could not fetch master playlist content:",
              playlistError
            );
          }
        } catch (fetchError) {
          console.warn("Could not test video URL accessibility:", fetchError);
          console.warn(
            "This might be a CORS issue. Check your S3 bucket CORS configuration."
          );
        }

        setMovie(movieData);

        // Check if ReactPlayer can play this URL
        if (typeof window !== "undefined") {
          const ReactPlayerModule = require("react-player");
          const canPlay = ReactPlayerModule.default?.canPlay?.(
            movieData.video_address
          );
          console.log("🎬 ReactPlayer can play URL:", canPlay);
          console.log("🎬 ReactPlayer module:", ReactPlayerModule);
        }
      } catch (err) {
        console.error("Error loading movie:", err);
        setError(err instanceof Error ? err.message : "Failed to load movie");
      } finally {
        setLoading(false);
      }
    };

    if (params.movie) {
      loadMovie();
    }
  }, [params.movie]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-center">
          <Skeleton className="h-20 w-20 rounded-full mx-auto mb-4" />
          <p className="text-white">Loading player...</p>
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-white">
            Error Loading Movie
          </h1>
          <p className="text-gray-400 mb-4">{error || "Movie not found"}</p>
          <Button
            onClick={() => router.push("/movie-library")}
            variant="outline"
            className="text-white border-white hover:bg-white/20"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 overflow-hidden"
    >
      {/* Full Screen Video Player */}
      <div className="absolute inset-0 z-0">
        {movie.video_address && playerMounted ? (
          <ReactPlayer
            src={movie.video_address}
            playing={playing}
            muted={muted}
            volume={volume}
            width="100%"
            height="100%"
            controls={true}
            pip={false}
            style={{ position: "absolute", top: 0, left: 0 }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={(error: any) => {
              console.error("❌ ReactPlayer error:", error);
              console.error("Error type:", error?.type);
              console.error("Error code:", error?.code);
              console.error("Error message:", error?.message);
              console.error("Error details:", JSON.stringify(error, null, 2));
              console.error("Failed URL:", movie.video_address);
              console.error("Error stack:", error?.stack);
              setError(
                `Failed to load video: ${
                  error?.message || "Unknown error"
                }. Please check the video URL and CORS settings.`
              );
            }}
            onReady={() => {
              console.log("✅ Player is ready");
              console.log("Player URL:", movie.video_address);
            }}
            onLoadStart={() => {
              console.log("🔄 Player started loading");
            }}
            onLoadedMetadata={() => {
              console.log("📊 Player loaded metadata");
            }}
            onStart={() => {
              console.log("▶️ Video started playing");
            }}
            onEnded={() => {
              console.log("🏁 Video ended");
            }}
            onProgress={(state: any) => {
              if (state?.loaded > 0) {
                console.log("Video progress:", {
                  played: Math.round((state.played || 0) * 100) + "%",
                  loaded: Math.round((state.loaded || 0) * 100) + "%",
                  playedSeconds: Math.round(state.playedSeconds || 0),
                  loadedSeconds: Math.round(state.loadedSeconds || 0),
                });
              }
            }}
            config={
              {
                file: {
                  attributes: {
                    controlsList: "nodownload",
                    crossOrigin: "anonymous",
                  },
                },
                hls: {
                  enableWorker: true,
                  debug: true, // Enable debug to see HLS loading issues
                  xhrSetup: (xhr: XMLHttpRequest, url: string) => {
                    // Allow CORS for S3
                    xhr.withCredentials = false;
                    console.log("📡 HLS loading URL:", url);
                  },
                  // Additional HLS.js configuration for better error handling
                  manifestLoadingTimeOut: 10000,
                  manifestLoadingMaxRetry: 3,
                  levelLoadingTimeOut: 10000,
                  levelLoadingMaxRetry: 3,
                  fragLoadingTimeOut: 20000,
                  fragLoadingMaxRetry: 3,
                },
              } as any
            }
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white">
            <p>
              {!playerMounted ? "Loading player..." : "No video URL available"}
            </p>
          </div>
        )}
      </div>

      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-300 z-10 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Top Gradient */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />

        {/* Bottom Gradient - positioned to not cover controls */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

        {/* Top Controls */}
        <div className="absolute top-0 left-0 right-0 p-6 pointer-events-auto z-10">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => router.push("/movie-library")}
            className="text-white hover:text-white hover:bg-white/20 transition-all"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back
          </Button>
        </div>
      </div>

    </div>
  );
}
