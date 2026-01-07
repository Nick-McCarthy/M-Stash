"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { MovieSchema, type Movie } from "@/lib/schemas/movies";
import { z } from "zod";

// Dynamically import ReactPlayer to avoid SSR issues
const ReactPlayer = dynamic(
  () => import("react-player"),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full text-white">Loading player...</div>
  }
);

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
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playerMounted, setPlayerMounted] = useState(false);

  useEffect(() => {
    // Ensure player only mounts on client side
    if (typeof window !== "undefined") {
      setPlayerMounted(true);
      console.log("Player component mounted");
    }
  }, []);

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
          const testResponse = await fetch(movieData.video_address, { method: 'HEAD' });
          console.log("Video URL accessibility test:", {
            status: testResponse.status,
            statusText: testResponse.statusText,
            headers: Object.fromEntries(testResponse.headers.entries()),
          });
          if (!testResponse.ok) {
            console.warn("Video URL returned non-OK status:", testResponse.status);
          }
        } catch (fetchError) {
          console.warn("Could not test video URL accessibility:", fetchError);
          console.warn("This might be a CORS issue. Check your S3 bucket CORS configuration.");
        }
        
        setMovie(movieData);
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
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-32 mb-4" />
          <Skeleton className="aspect-video w-full mb-4" />
          <Skeleton className="h-6 w-48" />
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error Loading Movie</h1>
          <p className="text-muted-foreground mb-4">{error || "Movie not found"}</p>
          <Button onClick={() => router.push("/movie-library")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/movie-library")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Button>
          <h1 className="text-3xl font-bold">{movie.title}</h1>
        </div>

        {/* Video Player */}
        <div className="mb-6">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            {movie.video_address && playerMounted ? (
              <ReactPlayer
                {...({
                  url: movie.video_address,
                  playing,
                  muted,
                  volume,
                  width: "100%",
                  height: "100%",
                  controls: true,
                  onPlay: () => setPlaying(true),
                  onPause: () => setPlaying(false),
                  onError: (error: any) => {
                    console.error("ReactPlayer error:", error);
                    console.error("Error type:", error?.type);
                    console.error("Error details:", error);
                    console.error("Failed URL:", movie.video_address);
                    setError(`Failed to load video: ${error?.message || "Unknown error"}. Please check the video URL and CORS settings.`);
                  },
                  onReady: () => {
                    console.log("Player is ready");
                    console.log("Player URL:", movie.video_address);
                  },
                  onStart: () => {
                    console.log("Video started playing");
                  },
                  onProgress: (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => {
                    if (state.loaded > 0) {
                      console.log("Video progress:", {
                        played: Math.round(state.played * 100) + "%",
                        loaded: Math.round(state.loaded * 100) + "%",
                        playedSeconds: Math.round(state.playedSeconds),
                        loadedSeconds: Math.round(state.loadedSeconds),
                      });
                    }
                  },
                  config: {
                    file: {
                      attributes: {
                        controlsList: "nodownload",
                        crossOrigin: "anonymous",
                      },
                      hlsOptions: {
                        enableWorker: true,
                        debug: true, // Enable debug to see HLS loading issues
                        xhrSetup: (xhr: XMLHttpRequest, url: string) => {
                          // Allow CORS for S3
                          xhr.withCredentials = false;
                          console.log("HLS loading URL:", url);
                        },
                      },
                    },
                  },
                } as any)}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-white">
                <p>{!playerMounted ? "Loading player..." : "No video URL available"}</p>
              </div>
            )}
          </div>
        </div>

        {/* Movie Info */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">Details</h2>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Views:</span>{" "}
                {movie.views.toLocaleString()}
              </p>
              <p>
                <span className="font-medium text-foreground">Updated:</span>{" "}
                {new Date(movie.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {movie.tags && movie.tags.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-2">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {movie.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

