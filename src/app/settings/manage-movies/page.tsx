"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Film, X, AlertTriangle, Trash2, Upload, Folder } from "lucide-react";
import { useTags } from "@/lib/queries/tags";
import { useMoviesWithFilters } from "@/lib/queries/movies";
import { useQueryClient } from "@tanstack/react-query";

// Custom hook to fetch genres (similar to tags)
function useGenres() {
  const [genres, setGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch("/api/genres");
        if (!response.ok) {
          throw new Error("Failed to fetch genres");
        }
        const data = await response.json();
        setGenres(data.genres || []);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchGenres();
  }, []);

  return { genres, isLoading, error };
}

// Custom hook to fetch all movies (handles pagination internally)
function useAllMovies() {
  const [allMovies, setAllMovies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAllMovies = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let page = 1;
        let allMoviesData: any[] = [];
        let hasMore = true;

        while (hasMore) {
          const response = await fetch(
            `/api/movie-library?page=${page}&itemsPerPage=100&sort=az-asc`
          );

          if (!response.ok) {
            throw new Error(`Failed to fetch movies: ${response.status}`);
          }

          const data = await response.json();
          allMoviesData = [...allMoviesData, ...data.movies];

          // Check if we've reached the last page
          hasMore = page < data.pagination.totalPages;
          page++;
        }

        setAllMovies(allMoviesData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllMovies();
  }, []);

  return { movies: allMovies, isLoading, error };
}

export default function ManageMovies() {
  const queryClient = useQueryClient();
  const {
    data: availableTags = [],
    isLoading: tagsLoading,
    error: tagsError,
  } = useTags();

  const {
    genres: availableGenres = [],
    isLoading: genresLoading,
    error: genresError,
  } = useGenres();

  // Fetch all movies for deletion
  const {
    movies: allMovies,
    isLoading: moviesLoading,
    error: moviesError,
  } = useAllMovies();

  
  // Delete movie state
  const [selectedMovie, setSelectedMovie] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Movie upload state
  const [movieUpload, setMovieUpload] = useState<{
    title: string;
    directoryFiles: FileList | null;
    thumbnailFile: File | null;
    spriteFile: File | null;
    thumbnail: string; // Preview URL
    tags: string[];
    genres: string[];
  }>({
    title: "",
    directoryFiles: null,
    thumbnailFile: null,
    spriteFile: null,
    thumbnail: "",
    tags: [],
    genres: [],
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleTagToggle = (tag: string) => {
    setMovieUpload((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const handleGenreToggle = (genre: string) => {
    setMovieUpload((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  };

  const handleDirectoryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setMovieUpload((prev) => ({
        ...prev,
        directoryFiles: files,
      }));
      setUploadError(null);
    }
  };

  const handleThumbnailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setMovieUpload((prev) => ({
        ...prev,
        thumbnail: previewUrl,
        thumbnailFile: file,
        thumbnailUrl: "",
      }));
      setUploadError(null);
    }
  };

  const handleSpriteFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMovieUpload((prev) => ({
        ...prev,
        spriteFile: file,
        spriteUrl: "",
      }));
      setUploadError(null);
    }
  };

  const handleUploadMovie = async () => {
    try {
      setIsUploading(true);
      setUploadError(null);

      if (!movieUpload.title.trim()) {
        throw new Error("Movie title is required");
      }

      if (!movieUpload.directoryFiles || movieUpload.directoryFiles.length === 0) {
        throw new Error("Please select a directory to upload");
      }

      // Check if master.m3u8 exists
      const hasMasterPlaylist = Array.from(movieUpload.directoryFiles).some(
        (file) => (file as any).webkitRelativePath?.includes("master.m3u8") || file.name === "master.m3u8"
      );

      if (!hasMasterPlaylist) {
        throw new Error("Directory must contain a master.m3u8 file");
      }

      // Create FormData for directory upload
      const formData = new FormData();
      formData.append("title", movieUpload.title.trim());
      formData.append("tags", JSON.stringify(movieUpload.tags));
      formData.append("genres", JSON.stringify(movieUpload.genres));

      // Append thumbnail if provided
      if (movieUpload.thumbnailFile) {
        formData.append("thumbnail", movieUpload.thumbnailFile);
      }

      // Append sprite if provided
      if (movieUpload.spriteFile) {
        formData.append("sprite", movieUpload.spriteFile);
      }

      // Append all files with their relative paths
      const filePaths: string[] = [];
      Array.from(movieUpload.directoryFiles).forEach((file) => {
        const relativePath = (file as any).webkitRelativePath || file.name;
        formData.append("files", file);
        filePaths.push(relativePath);
      });
      formData.append("filePaths", JSON.stringify(filePaths));

      const response = await fetch("/api/settings/manage-movies/upload-video-directory", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.details 
          ? `${errorData.error || "Failed to upload video directory"}: ${errorData.details}`
          : errorData.error || "Failed to upload video directory";
        console.error("Upload error response:", errorData);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("Video directory uploaded successfully:", result);
      alert("Movie uploaded successfully!");

      // Reset form on success
      setMovieUpload({
        title: "",
        directoryFiles: null,
        thumbnailFile: null,
        spriteFile: null,
        thumbnail: "",
        tags: [],
        genres: [],
      });

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ["movies"] });
    } catch (error) {
      console.error("Failed to upload movie:", error);
      setUploadError(
        error instanceof Error ? error.message : "Failed to upload movie"
      );
    } finally {
      setIsUploading(false);
    }
  };


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
        throw new Error(errorData.error || errorData.details || "Failed to delete movie");
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
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Film className="h-8 w-8" />
          Manage Movies
        </h1>
        <p className="text-muted-foreground mt-2">
          Upload new movies or manage existing content in your library.
        </p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Movie
          </TabsTrigger>
          <TabsTrigger value="delete" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Delete Movie
          </TabsTrigger>
        </TabsList>

        {/* Upload Movie Tab */}
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Movie
              </CardTitle>
              <CardDescription>
                Upload a complete HLS video directory. The directory should contain master.m3u8 and resolution folders (1080, 720, 480) with their playlists and segments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="movie-title">Movie Title *</Label>
                <Input
                  id="movie-title"
                  placeholder="Enter movie title"
                  value={movieUpload.title}
                  onChange={(e) =>
                    setMovieUpload((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Directory Upload */}
              <div className="space-y-2">
                <Label htmlFor="directory-upload">Select Video Directory *</Label>
                <Input
                  id="directory-upload"
                  type="file"
                  {...({ webkitdirectory: "" } as any)}
                  multiple
                  onChange={handleDirectoryFileChange}
                  disabled={isUploading}
                />
                <p className="text-sm text-muted-foreground">
                  Select the folder containing master.m3u8 and resolution subfolders (1080, 720, 480).
                </p>
                {movieUpload.directoryFiles && movieUpload.directoryFiles.length > 0 && (
                  <div className="mt-2 p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">
                      {movieUpload.directoryFiles.length} file(s) selected
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Array.from(movieUpload.directoryFiles)
                        .slice(0, 5)
                        .map((f) => (f as any).webkitRelativePath || f.name)
                        .join(", ")}
                      {movieUpload.directoryFiles.length > 5 && "..."}
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Thumbnail Upload */}
              <div className="space-y-2">
                <Label htmlFor="directory-thumbnail">Thumbnail (Optional)</Label>
                <Input
                  id="directory-thumbnail"
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailFileChange}
                  disabled={isUploading}
                />
                <p className="text-sm text-muted-foreground">
                  Upload a thumbnail image. It will be placed next to master.m3u8 in the movie directory.
                </p>
                {movieUpload.thumbnail && (
                  <div className="mt-2">
                    <img
                      src={movieUpload.thumbnail}
                      alt="Thumbnail preview"
                      className="w-32 h-32 object-cover rounded border"
                    />
                  </div>
                )}
              </div>

              {/* Sprite Upload */}
              <div className="space-y-2">
                <Label htmlFor="directory-sprite">Sprite (VTT Thumbnails) (Optional)</Label>
                <Input
                  id="directory-sprite"
                  type="file"
                  accept="image/*"
                  onChange={handleSpriteFileChange}
                  disabled={isUploading}
                />
                <p className="text-sm text-muted-foreground">
                  Upload a sprite image for video thumbnails. It will be placed next to master.m3u8 in the movie directory.
                </p>
              </div>

              <Separator />

              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags</Label>
                {tagsLoading ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </div>
                ) : tagsError ? (
                  <div className="text-sm text-destructive">
                    Failed to load tags. Please try again.
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map((tag) => (
                        <div key={tag} className="flex items-center space-x-2">
                          <Checkbox
                            id={`tag-${tag}`}
                            checked={movieUpload.tags.includes(tag)}
                            onCheckedChange={() => handleTagToggle(tag)}
                          />
                          <Label htmlFor={`tag-${tag}`} className="text-sm">
                            {tag}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {movieUpload.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {movieUpload.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {tag}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => handleTagToggle(tag)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Genres */}
              <div className="space-y-2">
                <Label>Genres</Label>
                {genresLoading ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </div>
                ) : genresError ? (
                  <div className="text-sm text-destructive">
                    Failed to load genres. Please try again.
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {availableGenres.map((genre) => (
                        <div key={genre} className="flex items-center space-x-2">
                          <Checkbox
                            id={`genre-${genre}`}
                            checked={movieUpload.genres.includes(genre)}
                            onCheckedChange={() => handleGenreToggle(genre)}
                          />
                          <Label htmlFor={`genre-${genre}`} className="text-sm">
                            {genre}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {movieUpload.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {movieUpload.genres.map((genre) => (
                          <Badge
                            key={genre}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {genre}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => handleGenreToggle(genre)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Error Message */}
              {uploadError && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="text-sm">{uploadError}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleUploadMovie}
                disabled={
                  isUploading ||
                  !movieUpload.title.trim() ||
                  !movieUpload.directoryFiles ||
                  movieUpload.directoryFiles.length === 0
                }
                className="w-full"
                size="lg"
              >
                {isUploading ? (
                  <>Uploading...</>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Movie
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delete Movie Tab */}
        <TabsContent value="delete">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Delete Movie
              </CardTitle>
              <CardDescription>
                Permanently remove a movie from your library. This action cannot be undone.
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
                  <Select value={selectedMovie} onValueChange={setSelectedMovie}>
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
                      The selected movie and all associated data will be permanently deleted from your library.
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
