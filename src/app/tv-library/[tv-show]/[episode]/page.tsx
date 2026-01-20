"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
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

interface Episode {
  episode_id: number;
  tv_show_id: number;
  season_number: number;
  episode_number: number;
  episode_title: string;
  video_address: string;
  sprite_address: string;
  thumbnail_address: string;
  views: number;
  updated_at: string;
}

async function fetchEpisode(
  tvShowId: number,
  episodeId: number
): Promise<Episode> {
  const response = await fetch(`/api/tv-library/${tvShowId}/${episodeId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch episode");
  }
  const data = await response.json();
  return data;
}

export default function EpisodePlayer() {
  const params = useParams();
  const router = useRouter();
  const [episode, setEpisode] = useState<Episode | null>(null);
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

  useEffect(() => {
    const loadEpisode = async () => {
      try {
        setLoading(true);
        setError(null);
        const tvShowId = z.coerce
          .number()
          .int()
          .positive()
          .parse(params["tv-show"]);
        const episodeId = z.coerce
          .number()
          .int()
          .positive()
          .parse(params.episode);
        const episodeData = await fetchEpisode(tvShowId, episodeId);
        console.log("Episode data loaded:", episodeData);
        setEpisode(episodeData);
      } catch (err) {
        console.error("Error loading episode:", err);
        setError(err instanceof Error ? err.message : "Failed to load episode");
      } finally {
        setLoading(false);
      }
    };

    if (params.episode && params["tv-show"]) {
      loadEpisode();
    }
  }, [params.episode, params["tv-show"]]);

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

  if (error || !episode) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-white">
            Error Loading Episode
          </h1>
          <p className="text-gray-400 mb-4">{error || "Episode not found"}</p>
          <Button
            onClick={() => router.push(`/tv-library/${params["tv-show"]}`)}
            variant="outline"
            className="text-white border-white hover:bg-white/20"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Show
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
        {episode.video_address && playerMounted ? (
          <ReactPlayer
            src={episode.video_address}
            playing={playing}
            muted={muted}
            volume={volume}
            width="100%"
            height="100%"
            controls={true}
            pip={false}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={(error: any) => {
              console.error("❌ ReactPlayer error:", error);
              console.error("Error type:", error?.type);
              console.error("Error code:", error?.code);
              console.error("Error message:", error?.message);
              console.error("Error details:", JSON.stringify(error, null, 2));
              console.error("Failed URL:", episode.video_address);
              console.error("Error stack:", error?.stack);
              setError(
                `Failed to load video: ${
                  error?.message || "Unknown error"
                }. Please check the video URL and CORS settings.`
              );
            }}
            onReady={() => {
              console.log("✅ Player is ready");
              console.log("Player URL:", episode.video_address);
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
                  debug: true,
                  xhrSetup: (xhr: XMLHttpRequest, url: string) => {
                    xhr.withCredentials = false;
                    console.log("📡 HLS loading URL:", url);
                  },
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

        {/* Bottom Gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

        {/* Top Controls */}
        <div className="absolute top-0 left-0 right-0 p-6 pointer-events-auto z-10">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => router.push(`/tv-library/${params["tv-show"]}`)}
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
