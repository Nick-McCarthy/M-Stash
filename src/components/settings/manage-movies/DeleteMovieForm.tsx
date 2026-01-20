"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, AlertTriangle } from "lucide-react";
import { useAllMovies } from "@/hooks/useAllMovies";
import { useQueryClient } from "@tanstack/react-query";

export function DeleteMovieForm() {
  const queryClient = useQueryClient();
  const {
    movies: allMovies,
    isLoading: moviesLoading,
    error: moviesError,
  } = useAllMovies();

  const [selectedMovie, setSelectedMovie] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteMovie = async () => {
    try {
      setIsDeleting(true);
      setDeleteError(null);

      if (!selectedMovie) {
        throw new Error("Please select a movie to delete");
      }

      const response = await fetch(
        `/api/settings/manage-movies/delete-movie?movie_id=${selectedMovie}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || errorData.details || "Failed to delete movie"
        );
      }

      // Reset selection and refresh movies list
      setSelectedMovie("");
      alert("Movie deleted successfully!");

      // Refresh the movies list by invalidating queries
      queryClient.invalidateQueries({ queryKey: ["movies"] });
    } catch (error) {
      console.error("Failed to delete movie:", error);
      setDeleteError(
        error instanceof Error ? error.message : "Failed to delete movie"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Delete Movie
        </CardTitle>
        <CardDescription>
          Permanently remove a movie from your library. This action cannot be
          undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Select Movie to Delete</Label>
          {moviesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <p className="text-sm text-muted-foreground">Loading movies...</p>
            </div>
          ) : moviesError ? (
            <div className="text-sm text-destructive">
              Failed to load movies. Please try again.
            </div>
          ) : (
            <Select
              value={selectedMovie}
              onValueChange={setSelectedMovie}
              disabled={isDeleting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a movie to delete" />
              </SelectTrigger>
              <SelectContent>
                {allMovies && allMovies.length > 0 ? (
                  allMovies.map((movie) => (
                    <SelectItem
                      key={movie.movie_id}
                      value={movie.movie_id.toString()}
                    >
                      {movie.title} ({movie.views} views)
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-movies" disabled>
                    No movies available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
        </div>

        {selectedMovie && (
          <>
            <Separator />
            <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
              <p className="text-sm text-destructive font-medium mb-2">
                ⚠️ Warning: This action cannot be undone
              </p>
              <p className="text-sm text-muted-foreground">
                The selected movie and all associated data will be permanently
                deleted from your library.
              </p>
            </div>

            {deleteError && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm">{deleteError}</p>
              </div>
            )}

            <Button
              variant="destructive"
              onClick={handleDeleteMovie}
              disabled={isDeleting || !selectedMovie}
              className="w-full"
              size="lg"
            >
              {isDeleting ? (
                <>Deleting...</>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Movie
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
