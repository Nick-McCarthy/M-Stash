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
import { Textarea } from "@/components/ui/textarea";
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
import {
  Plus,
  Upload,
  Trash2,
  Tv,
  X,
  AlertTriangle,
  Folder,
} from "lucide-react";
import { useTags } from "@/lib/queries/tags";
import { useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";

// Custom hook to fetch all TV shows
function useAllTvShows() {
  const [allTvShows, setAllTvShows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAllTvShows = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let page = 1;
        let allShowsData: any[] = [];
        let hasMore = true;

        while (hasMore) {
          const response = await fetch(
            `/api/tv-library?page=${page}&itemsPerPage=100&sort=az-asc`
          );

          if (!response.ok) {
            throw new Error(`Failed to fetch TV shows: ${response.status}`);
          }

          const data = await response.json();
          allShowsData = [...allShowsData, ...data.tv_shows];

          hasMore = page < data.pagination.totalPages;
          page++;
        }

        setAllTvShows(allShowsData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllTvShows();
  }, []);

  return { tvShows: allTvShows, isLoading, error };
}

export default function ManageTvShows() {
  const queryClient = useQueryClient();
  const {
    data: availableTags = [],
    isLoading: tagsLoading,
    error: tagsError,
  } = useTags();

  // Fetch all TV shows for deletion and episode management
  const {
    tvShows: allTvShows,
    isLoading: tvShowsLoading,
    error: tvShowsError,
  } = useAllTvShows();

  // Create TV Show state
  const [tvShowCreate, setTvShowCreate] = useState<{
    title: string;
    description: string;
    thumbnailFile: File | null;
    thumbnail: string;
    thumbnailAddress: string;
    tags: string[];
  }>({
    title: "",
    description: "",
    thumbnailFile: null,
    thumbnail: "",
    thumbnailAddress: "",
    tags: [],
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Upload Episode state
  const [episodeUpload, setEpisodeUpload] = useState<{
    tvShowId: string;
    seasonNumber: string;
    episodeNumber: string;
    episodeTitle: string;
    directoryFiles: FileList | null;
    spriteFile: File | null;
  }>({
    tvShowId: "",
    seasonNumber: "",
    episodeNumber: "",
    episodeTitle: "",
    directoryFiles: null,
    spriteFile: null,
  });
  const [isUploadingEpisode, setIsUploadingEpisode] = useState(false);
  const [episodeUploadError, setEpisodeUploadError] = useState<string | null>(
    null
  );
  const [episodeUploadProgress, setEpisodeUploadProgress] = useState(0);

  // Delete TV Show state
  const [selectedTvShow, setSelectedTvShow] = useState<string>("");
  const [isDeletingTvShow, setIsDeletingTvShow] = useState(false);
  const [deleteTvShowError, setDeleteTvShowError] = useState<string | null>(
    null
  );

  // Delete Episode state
  const [selectedTvShowForEpisode, setSelectedTvShowForEpisode] =
    useState<string>("");
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<string>("");
  const [isDeletingEpisode, setIsDeletingEpisode] = useState(false);
  const [deleteEpisodeError, setDeleteEpisodeError] = useState<string | null>(
    null
  );

  // Handle tag toggle for create TV show
  const handleTagToggle = (tag: string) => {
    setTvShowCreate((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  // Handle thumbnail file change
  const handleThumbnailFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setTvShowCreate((prev) => ({
        ...prev,
        thumbnail: previewUrl,
        thumbnailFile: file,
        thumbnailAddress: "",
      }));
      setCreateError(null);
    }
  };

  // Handle thumbnail URL change
  const handleThumbnailUrlChange = (url: string) => {
    setTvShowCreate((prev) => ({
      ...prev,
      thumbnailAddress: url,
      thumbnailFile: null,
      thumbnail: "",
    }));
  };

  // Create TV Show handler
  const handleCreateTvShow = async () => {
    try {
      setIsCreating(true);
      setCreateError(null);

      if (!tvShowCreate.title.trim()) {
        throw new Error("TV show title is required");
      }

      if (
        !tvShowCreate.thumbnailFile &&
        !tvShowCreate.thumbnailAddress.trim()
      ) {
        throw new Error(
          "Thumbnail is required. Either upload a file or provide a URL."
        );
      }

      const formData = new FormData();
      formData.append("title", tvShowCreate.title.trim());
      formData.append("description", tvShowCreate.description || "");
      formData.append("tags", JSON.stringify(tvShowCreate.tags));

      if (tvShowCreate.thumbnailFile) {
        formData.append("thumbnail", tvShowCreate.thumbnailFile);
      }

      if (tvShowCreate.thumbnailAddress) {
        formData.append("thumbnail_address", tvShowCreate.thumbnailAddress);
      }

      const response = await fetch(
        "/api/settings/manage-tv-shows/create-tv-show",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || errorData.details || "Failed to create TV show"
        );
      }

      const result = await response.json();
      console.log("TV show created successfully:", result);
      alert("TV show created successfully!");

      // Reset form
      setTvShowCreate({
        title: "",
        description: "",
        thumbnailFile: null,
        thumbnail: "",
        thumbnailAddress: "",
        tags: [],
      });

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ["tv-shows"] });
    } catch (error) {
      console.error("Failed to create TV show:", error);
      setCreateError(
        error instanceof Error ? error.message : "Failed to create TV show"
      );
    } finally {
      setIsCreating(false);
    }
  };

  // Handle episode directory file change
  const handleEpisodeDirectoryFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setEpisodeUpload((prev) => ({
        ...prev,
        directoryFiles: files,
      }));
      setEpisodeUploadError(null);
    }
  };

  // Handle sprite file change
  const handleSpriteFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEpisodeUpload((prev) => ({
        ...prev,
        spriteFile: file,
      }));
      setEpisodeUploadError(null);
    }
  };

  // Upload Episode handler
  const handleUploadEpisode = async () => {
    console.log("handleUploadEpisode called", episodeUpload);
    try {
      setIsUploadingEpisode(true);
      setEpisodeUploadError(null);
      setEpisodeUploadProgress(0);

      if (!episodeUpload.tvShowId) {
        const error = "Please select a TV show";
        console.error(error);
        setEpisodeUploadError(error);
        setIsUploadingEpisode(false);
        return;
      }

      if (
        !episodeUpload.seasonNumber ||
        !episodeUpload.episodeNumber ||
        !episodeUpload.episodeTitle.trim()
      ) {
        const error = "Season number, episode number, and episode title are required";
        console.error(error);
        setEpisodeUploadError(error);
        setIsUploadingEpisode(false);
        return;
      }

      if (
        !episodeUpload.directoryFiles ||
        episodeUpload.directoryFiles.length === 0
      ) {
        const error = "Please select a directory to upload";
        console.error(error);
        setEpisodeUploadError(error);
        setIsUploadingEpisode(false);
        return;
      }

      // Check if master.m3u8 exists
      const hasMasterPlaylist = Array.from(episodeUpload.directoryFiles).some(
        (file) =>
          (file as any).webkitRelativePath?.includes("master.m3u8") ||
          file.name === "master.m3u8"
      );

      if (!hasMasterPlaylist) {
        const error = "Directory must contain a master.m3u8 file";
        console.error(error);
        setEpisodeUploadError(error);
        setIsUploadingEpisode(false);
        return;
      }

      console.log("Creating FormData...");
      const formData = new FormData();
      formData.append("tv_show_id", episodeUpload.tvShowId);
      formData.append("season_number", episodeUpload.seasonNumber);
      formData.append("episode_number", episodeUpload.episodeNumber);
      formData.append("episode_title", episodeUpload.episodeTitle.trim());

      if (episodeUpload.spriteFile) {
        formData.append("sprite", episodeUpload.spriteFile);
      }

      // Append all files with their relative paths
      const filePaths: string[] = [];
      Array.from(episodeUpload.directoryFiles).forEach((file) => {
        const relativePath = (file as any).webkitRelativePath || file.name;
        formData.append("files", file);
        filePaths.push(relativePath);
      });
      formData.append("filePaths", JSON.stringify(filePaths));

      console.log("Starting upload with XMLHttpRequest...");
      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      const promise = new Promise((resolve, reject) => {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            setEpisodeUploadProgress(percentComplete);
            console.log(`Upload progress: ${percentComplete}%`);
          }
        });

        xhr.addEventListener("load", () => {
          console.log("XHR load event, status:", xhr.status);
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              console.log("Upload successful:", result);
              resolve(result);
            } catch (e) {
              console.error("Failed to parse response:", e, xhr.responseText);
              reject(new Error("Failed to parse response"));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              const errorMessage = errorData.details
                ? `${errorData.error || "Failed to upload episode"}: ${
                    errorData.details
                  }`
                : errorData.error || "Failed to upload episode";
              console.error("Upload error:", errorMessage);
              reject(new Error(errorMessage));
            } catch (e) {
              console.error("Failed to parse error response:", e, xhr.responseText);
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener("error", (e) => {
          console.error("XHR error event:", e);
          reject(new Error("Network error during upload"));
        });

        xhr.addEventListener("abort", () => {
          console.error("XHR abort event");
          reject(new Error("Upload was aborted"));
        });

        console.log("Opening XHR connection...");
        xhr.open("POST", "/api/settings/manage-tv-shows/upload-episode");
        console.log("Sending XHR request...");
        xhr.send(formData);
      });

      const result = await promise;
      console.log("Episode uploaded successfully:", result);
      setEpisodeUploadProgress(100);
      alert("Episode uploaded successfully!");

      // Reset form
      setEpisodeUpload({
        tvShowId: episodeUpload.tvShowId, // Keep TV show selected
        seasonNumber: "",
        episodeNumber: "",
        episodeTitle: "",
        directoryFiles: null,
        spriteFile: null,
      });

      // Refresh queries and episodes list
      queryClient.invalidateQueries({ queryKey: ["tv-shows"] });
      if (selectedTvShowForEpisode) {
        loadEpisodesForShow(selectedTvShowForEpisode);
      }
    } catch (error) {
      console.error("Failed to upload episode:", error);
      setEpisodeUploadError(
        error instanceof Error ? error.message : "Failed to upload episode"
      );
      setEpisodeUploadProgress(0);
    } finally {
      setIsUploadingEpisode(false);
    }
  };

  // Load episodes for a TV show
  const loadEpisodesForShow = async (tvShowId: string) => {
    try {
      setIsLoadingEpisodes(true);
      const response = await fetch(`/api/tv-library/${tvShowId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch episodes");
      }
      const data = await response.json();

      // Flatten episodes from all seasons
      const allEpisodes: any[] = [];
      if (data.seasons) {
        data.seasons.forEach((season: any) => {
          season.episodes.forEach((ep: any) => {
            allEpisodes.push({
              ...ep,
              season_number: season.season_number,
            });
          });
        });
      }
      setEpisodes(allEpisodes);
    } catch (error) {
      console.error("Failed to load episodes:", error);
      setEpisodes([]);
    } finally {
      setIsLoadingEpisodes(false);
    }
  };

  // Handle TV show selection for episode deletion
  useEffect(() => {
    if (selectedTvShowForEpisode) {
      loadEpisodesForShow(selectedTvShowForEpisode);
    } else {
      setEpisodes([]);
      setSelectedEpisode("");
    }
  }, [selectedTvShowForEpisode]);

  // Delete TV Show handler
  const handleDeleteTvShow = async () => {
    try {
      setIsDeletingTvShow(true);
      setDeleteTvShowError(null);

      if (!selectedTvShow) {
        throw new Error("Please select a TV show to delete");
      }

      const response = await fetch(
        `/api/settings/manage-tv-shows/delete-tv-show?tv_show_id=${selectedTvShow}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || errorData.details || "Failed to delete TV show"
        );
      }

      setSelectedTvShow("");
      alert("TV show deleted successfully!");

      queryClient.invalidateQueries({ queryKey: ["tv-shows"] });
    } catch (error) {
      console.error("Failed to delete TV show:", error);
      setDeleteTvShowError(
        error instanceof Error ? error.message : "Failed to delete TV show"
      );
    } finally {
      setIsDeletingTvShow(false);
    }
  };

  // Delete Episode handler
  const handleDeleteEpisode = async () => {
    try {
      setIsDeletingEpisode(true);
      setDeleteEpisodeError(null);

      if (!selectedEpisode) {
        throw new Error("Please select an episode to delete");
      }

      const response = await fetch(
        `/api/settings/manage-tv-shows/delete-episode?episode_id=${selectedEpisode}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || errorData.details || "Failed to delete episode"
        );
      }

      setSelectedEpisode("");
      alert("Episode deleted successfully!");

      queryClient.invalidateQueries({ queryKey: ["tv-shows"] });
      if (selectedTvShowForEpisode) {
        loadEpisodesForShow(selectedTvShowForEpisode);
      }
    } catch (error) {
      console.error("Failed to delete episode:", error);
      setDeleteEpisodeError(
        error instanceof Error ? error.message : "Failed to delete episode"
      );
    } finally {
      setIsDeletingEpisode(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Tv className="h-8 w-8" />
          Manage TV Shows
        </h1>
        <p className="text-muted-foreground mt-2">
          Create new TV shows, upload episodes, or manage existing content in
          your library.
        </p>
      </div>

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create TV Show
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Episodes
          </TabsTrigger>
          <TabsTrigger value="delete-show" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Delete Show
          </TabsTrigger>
          <TabsTrigger
            value="delete-episode"
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Episodes
          </TabsTrigger>
        </TabsList>

        {/* Create TV Show Tab */}
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create TV Show
              </CardTitle>
              <CardDescription>
                Create a new TV show entry. Episodes can be added later.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="tv-show-title">TV Show Title *</Label>
                <Input
                  id="tv-show-title"
                  placeholder="Enter TV show title"
                  value={tvShowCreate.title}
                  onChange={(e) =>
                    setTvShowCreate((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="tv-show-description">
                  Description (Optional)
                </Label>
                <Textarea
                  id="tv-show-description"
                  placeholder="Enter TV show description"
                  value={tvShowCreate.description}
                  onChange={(e) =>
                    setTvShowCreate((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={4}
                />
              </div>

              <Separator />

              {/* Thumbnail Upload */}
              <div className="space-y-2">
                <Label htmlFor="tv-show-thumbnail">Thumbnail *</Label>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="thumbnail-file">Upload File</Label>
                    <Input
                      id="thumbnail-file"
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailFileChange}
                      disabled={isCreating}
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thumbnail-url">Provide URL</Label>
                    <Input
                      id="thumbnail-url"
                      placeholder="https://example.com/thumbnail.jpg"
                      value={tvShowCreate.thumbnailAddress}
                      onChange={(e) => handleThumbnailUrlChange(e.target.value)}
                      disabled={isCreating}
                    />
                  </div>
                </div>
                {tvShowCreate.thumbnail && (
                  <div className="mt-2">
                    <img
                      src={tvShowCreate.thumbnail}
                      alt="Thumbnail preview"
                      className="w-32 h-32 object-cover rounded border"
                    />
                  </div>
                )}
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
                            id={`create-tag-${tag}`}
                            checked={tvShowCreate.tags.includes(tag)}
                            onCheckedChange={() => handleTagToggle(tag)}
                          />
                          <Label
                            htmlFor={`create-tag-${tag}`}
                            className="text-sm"
                          >
                            {tag}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {tvShowCreate.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tvShowCreate.tags.map((tag) => (
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

              {/* Error Message */}
              {createError && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="text-sm">{createError}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleCreateTvShow}
                disabled={
                  isCreating ||
                  !tvShowCreate.title.trim() ||
                  (!tvShowCreate.thumbnailFile &&
                    !tvShowCreate.thumbnailAddress.trim())
                }
                className="w-full"
                size="lg"
              >
                {isCreating ? (
                  <>Creating...</>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create TV Show
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upload Episodes Tab */}
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Episode
              </CardTitle>
              <CardDescription>
                Upload a complete HLS video directory for an episode. The
                directory should contain master.m3u8 and resolution folders
                (1080, 720, 480) with their playlists and segments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* TV Show Selection */}
              <div className="space-y-2">
                <Label htmlFor="episode-tv-show">TV Show *</Label>
                {tvShowsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : tvShowsError ? (
                  <div className="text-sm text-destructive">
                    Failed to load TV shows. Please try again.
                  </div>
                ) : (
                  <Select
                    value={episodeUpload.tvShowId}
                    onValueChange={(value) =>
                      setEpisodeUpload((prev) => ({
                        ...prev,
                        tvShowId: value,
                      }))
                    }
                    disabled={isUploadingEpisode}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a TV show" />
                    </SelectTrigger>
                    <SelectContent>
                      {allTvShows.map((show) => (
                        <SelectItem
                          key={show.tv_show_id}
                          value={show.tv_show_id.toString()}
                        >
                          {show.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Season and Episode Numbers */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="season-number">Season Number *</Label>
                  <Input
                    id="season-number"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={episodeUpload.seasonNumber}
                    onChange={(e) =>
                      setEpisodeUpload((prev) => ({
                        ...prev,
                        seasonNumber: e.target.value,
                      }))
                    }
                    disabled={isUploadingEpisode}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="episode-number">Episode Number *</Label>
                  <Input
                    id="episode-number"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={episodeUpload.episodeNumber}
                    onChange={(e) =>
                      setEpisodeUpload((prev) => ({
                        ...prev,
                        episodeNumber: e.target.value,
                      }))
                    }
                    disabled={isUploadingEpisode}
                  />
                </div>
              </div>

              {/* Episode Title */}
              <div className="space-y-2">
                <Label htmlFor="episode-title">Episode Title *</Label>
                <Input
                  id="episode-title"
                  placeholder="Enter episode title"
                  value={episodeUpload.episodeTitle}
                  onChange={(e) =>
                    setEpisodeUpload((prev) => ({
                      ...prev,
                      episodeTitle: e.target.value,
                    }))
                  }
                  disabled={isUploadingEpisode}
                />
              </div>

              <Separator />

              {/* Directory Upload */}
              <div className="space-y-2">
                <Label htmlFor="episode-directory-upload">
                  Select Video Directory *
                </Label>
                <Input
                  id="episode-directory-upload"
                  type="file"
                  {...({ webkitdirectory: "" } as any)}
                  multiple
                  onChange={handleEpisodeDirectoryFileChange}
                  disabled={isUploadingEpisode}
                />
                <p className="text-sm text-muted-foreground">
                  Select the folder containing master.m3u8 and resolution
                  subfolders (1080, 720, 480).
                </p>
                {episodeUpload.directoryFiles &&
                  episodeUpload.directoryFiles.length > 0 && (
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium">
                        {episodeUpload.directoryFiles.length} file(s) selected
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Array.from(episodeUpload.directoryFiles)
                          .slice(0, 5)
                          .map((f) => (f as any).webkitRelativePath || f.name)
                          .join(", ")}
                        {episodeUpload.directoryFiles.length > 5 && "..."}
                      </p>
                    </div>
                  )}
              </div>

              {/* Sprite Upload */}
              <div className="space-y-2">
                <Label htmlFor="episode-sprite">
                  Sprite (VTT Thumbnails) (Optional)
                </Label>
                <Input
                  id="episode-sprite"
                  type="file"
                  accept="image/*"
                  onChange={handleSpriteFileChange}
                  disabled={isUploadingEpisode}
                />
                <p className="text-sm text-muted-foreground">
                  Upload a sprite image for video thumbnails.
                </p>
              </div>

              {/* Error Message */}
              {episodeUploadError && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="text-sm">{episodeUploadError}</p>
                </div>
              )}

              {/* Progress Bar */}
              {isUploadingEpisode && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Uploading...</span>
                    <span className="font-medium">{episodeUploadProgress}%</span>
                  </div>
                  <Progress value={episodeUploadProgress} />
                </div>
              )}

              {/* Debug info - remove in production */}
              {process.env.NODE_ENV === "development" && (
                <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                  <div>TV Show ID: {episodeUpload.tvShowId || "not set"}</div>
                  <div>Season: {episodeUpload.seasonNumber || "not set"}</div>
                  <div>Episode: {episodeUpload.episodeNumber || "not set"}</div>
                  <div>Title: {episodeUpload.episodeTitle || "not set"}</div>
                  <div>Files: {episodeUpload.directoryFiles?.length || 0} selected</div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleUploadEpisode}
                disabled={
                  isUploadingEpisode ||
                  !episodeUpload.tvShowId ||
                  !episodeUpload.seasonNumber ||
                  episodeUpload.seasonNumber === "" ||
                  !episodeUpload.episodeNumber ||
                  episodeUpload.episodeNumber === "" ||
                  !episodeUpload.episodeTitle ||
                  episodeUpload.episodeTitle.trim() === "" ||
                  !episodeUpload.directoryFiles ||
                  episodeUpload.directoryFiles.length === 0
                }
                className="w-full"
                size="lg"
              >
                {isUploadingEpisode ? (
                  <>Uploading...</>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Episode
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delete Show Tab */}
        <TabsContent value="delete-show">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Delete TV Show
              </CardTitle>
              <CardDescription>
                Permanently delete a TV show and all its episodes from the
                library.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="delete-tv-show-select">
                  Select TV Show to Delete
                </Label>
                {tvShowsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : tvShowsError ? (
                  <div className="text-sm text-destructive">
                    Failed to load TV shows. Please try again.
                  </div>
                ) : (
                  <Select
                    value={selectedTvShow}
                    onValueChange={setSelectedTvShow}
                    disabled={isDeletingTvShow}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a TV show to delete" />
                    </SelectTrigger>
                    <SelectContent>
                      {allTvShows.map((show) => (
                        <SelectItem
                          key={show.tv_show_id}
                          value={show.tv_show_id.toString()}
                        >
                          {show.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {deleteTvShowError && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="text-sm">{deleteTvShowError}</p>
                </div>
              )}

              <Button
                onClick={handleDeleteTvShow}
                disabled={!selectedTvShow || isDeletingTvShow}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                {isDeletingTvShow ? (
                  <>Deleting...</>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete TV Show
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delete Episodes Tab */}
        <TabsContent value="delete-episode">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Delete Episode
              </CardTitle>
              <CardDescription>
                Permanently delete an episode from a TV show.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="delete-episode-tv-show-select">
                  Select TV Show
                </Label>
                {tvShowsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : tvShowsError ? (
                  <div className="text-sm text-destructive">
                    Failed to load TV shows. Please try again.
                  </div>
                ) : (
                  <Select
                    value={selectedTvShowForEpisode}
                    onValueChange={setSelectedTvShowForEpisode}
                    disabled={isDeletingEpisode}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a TV show" />
                    </SelectTrigger>
                    <SelectContent>
                      {allTvShows.map((show) => (
                        <SelectItem
                          key={show.tv_show_id}
                          value={show.tv_show_id.toString()}
                        >
                          {show.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {selectedTvShowForEpisode && (
                <div className="space-y-2">
                  <Label htmlFor="delete-episode-select">
                    Select Episode to Delete
                  </Label>
                  {isLoadingEpisodes ? (
                    <Skeleton className="h-10 w-full" />
                  ) : episodes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No episodes found for this TV show.
                    </p>
                  ) : (
                    <Select
                      value={selectedEpisode}
                      onValueChange={setSelectedEpisode}
                      disabled={isDeletingEpisode}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an episode to delete" />
                      </SelectTrigger>
                      <SelectContent>
                        {episodes
                          .sort((a, b) => {
                            if (a.season_number !== b.season_number) {
                              return a.season_number - b.season_number;
                            }
                            return a.episode_number - b.episode_number;
                          })
                          .map((ep) => (
                            <SelectItem
                              key={ep.episode_id}
                              value={ep.episode_id.toString()}
                            >
                              S{ep.season_number.toString().padStart(2, "0")}E
                              {ep.episode_number.toString().padStart(2, "0")} -{" "}
                              {ep.episode_title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {deleteEpisodeError && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="text-sm">{deleteEpisodeError}</p>
                </div>
              )}

              <Button
                onClick={handleDeleteEpisode}
                disabled={!selectedEpisode || isDeletingEpisode}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                {isDeletingEpisode ? (
                  <>Deleting...</>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Episode
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
