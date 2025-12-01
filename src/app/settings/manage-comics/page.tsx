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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Upload, Trash2, BookOpen, X, AlertTriangle } from "lucide-react";
import { useTags } from "@/lib/queries/tags";
import { useComicsWithFilters, useCreateComic } from "@/lib/queries/comics";
import { ComicComboBox } from "@/components/ui/comic-combo-box";
import { ChapterUpload } from "@/components/ui/chapter-upload";

// Custom hook to fetch all comics (handles pagination internally)
function useAllComics() {
  const [allComics, setAllComics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAllComics = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let page = 1;
        let allComicsData: any[] = [];
        let hasMore = true;

        while (hasMore) {
          const response = await fetch(
            `/api/comic-library?page=${page}&itemsPerPage=100&sort=az-asc`
          );

          if (!response.ok) {
            throw new Error(`Failed to fetch comics: ${response.status}`);
          }

          const data = await response.json();
          allComicsData = [...allComicsData, ...data.comics];

          // Check if we've reached the last page
          hasMore = page < data.pagination.totalPages;
          page++;
        }

        setAllComics(allComicsData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllComics();
  }, []);

  return { comics: allComics, isLoading, error };
}

// Mock data for chapters - replace with actual API calls
const mockChapters = [
  { id: 1, comic_id: 1, chapter_number: 1, favorite: false },
  { id: 2, comic_id: 1, chapter_number: 2, favorite: true },
];

const comicTypes = [
  { value: "manga", label: "Manga" },
  { value: "webtoon", label: "Webtoon" },
  { value: "western", label: "Western" },
];

const comicStatuses = [
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "hiatus", label: "Hiatus" },
  { value: "cancelled", label: "Cancelled" },
];

export default function ManageComics() {
  const {
    data: availableTags = [],
    isLoading: tagsLoading,
    error: tagsError,
  } = useTags();

  // Fetch all comics from database
  const {
    comics: comicsData,
    isLoading: comicsLoading,
    error: comicsError,
  } = useAllComics();

  // Create comic mutation
  const createComicMutation = useCreateComic();

  const [selectedComic, setSelectedComic] = useState<string>("");
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);

  // Create New Comic Form State
  const [newComic, setNewComic] = useState({
    title: "",
    thumbnail: "",
    thumbnailFile: null as File | null,
    description: "",
    type: "",
    status: "ongoing",
    tags: [] as string[],
  });

  const [uploadError, setUploadError] = useState<string | null>(null);

  // Upload Chapters Form State
  const [uploadForm, setUploadForm] = useState({
    comicId: "",
    selectedComic: null as any,
  });

  const handleTagToggle = (tag: string) => {
    setNewComic((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const handleThumbnailUpload = (file: File) => {
    // Create preview URL for display
    const previewUrl = URL.createObjectURL(file);
    setNewComic((prev) => ({
      ...prev,
      thumbnail: previewUrl,
      thumbnailFile: file,
    }));
    setUploadError(null);
  };

  const handleThumbnailError = (error: string) => {
    setUploadError(error);
  };

  const handleCreateComic = async () => {
    try {
      setUploadError(null);

      if (!newComic.thumbnailFile) {
        throw new Error("Please select a thumbnail image");
      }

      // Create FormData for file upload
      const formData = new FormData();

      // Add thumbnail file
      formData.append("thumbnail", newComic.thumbnailFile);
      formData.append("comic_title", newComic.title);
      formData.append("comic_description", newComic.description || "");
      formData.append("comic_type", newComic.type);
      formData.append("tags", JSON.stringify(newComic.tags));

      const response = await fetch("/api/settings/manage-comics/create-comic", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create comic");
      }

      const result = await response.json();

      // Reset form on success
      setNewComic({
        title: "",
        thumbnail: "",
        thumbnailFile: null,
        description: "",
        type: "",
        status: "ongoing",
        tags: [],
      });

      console.log("Comic created successfully:", result);
    } catch (error) {
      console.error("Failed to create comic:", error);
      setUploadError(
        error instanceof Error ? error.message : "Failed to create comic"
      );
    }
  };

  const handleComicSelect = (comicId: string) => {
    const selectedComic =
      comicsData?.find((comic) => comic.comic_id.toString() === comicId) ||
      null;
    setUploadForm({
      comicId,
      selectedComic,
    });
  };

  const handleChapterUploadComplete = (result: any) => {
    console.log("Chapter upload completed:", result);
    // Reset form and clear errors
    setUploadForm({
      comicId: "",
      selectedComic: null,
    });
    setUploadError(null);
  };

  const handleChapterUploadError = (error: string) => {
    console.error("Chapter upload error:", error);
    setUploadError(error);
  };

  const handleDeleteComic = () => {
    // TODO: Implement API call to delete comic
    console.log("Deleting comic:", selectedComic);
    setSelectedComic("");
  };

  const handleDeleteChapters = () => {
    // TODO: Implement API call to delete chapters
    console.log("Deleting chapters:", selectedChapters);
    setSelectedChapters([]);
  };

  const toggleChapterSelection = (chapterId: number) => {
    setSelectedChapters((prev) =>
      prev.includes(chapterId)
        ? prev.filter((id) => id !== chapterId)
        : [...prev, chapterId]
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-8 w-8" />
          Manage Comics
        </h1>
        <p className="text-muted-foreground mt-2">
          Create new comics, upload chapters, or manage existing content.
        </p>
      </div>

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New Comic
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Chapters
          </TabsTrigger>
          <TabsTrigger value="delete-comic" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Delete Comic
          </TabsTrigger>
          <TabsTrigger
            value="delete-chapters"
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Comic Chapters
          </TabsTrigger>
        </TabsList>

        {/* Create New Comic Tab */}
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create New Comic</CardTitle>
              <CardDescription>
                Add a new comic to your library with all the necessary details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="comic-title">Comic Title *</Label>
                  <Input
                    id="comic-title"
                    placeholder="Enter comic title"
                    value={newComic.title}
                    onChange={(e) =>
                      setNewComic((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="thumbnail">Thumbnail *</Label>
                  <Input
                    id="thumbnail"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleThumbnailUpload(file);
                      }
                    }}
                    disabled={!newComic.type || !newComic.title}
                  />
                  {newComic.thumbnail && (
                    <div className="mt-2">
                      <img
                        src={newComic.thumbnail}
                        alt="Thumbnail preview"
                        className="w-32 h-32 object-cover rounded border"
                      />
                    </div>
                  )}
                </div>
                {uploadError && (
                  <p className="text-sm text-destructive">{uploadError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter comic description"
                  value={newComic.description}
                  onChange={(e) =>
                    setNewComic((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Comic Type *</Label>
                  <Select
                    value={newComic.type}
                    onValueChange={(value) =>
                      setNewComic((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select comic type" />
                    </SelectTrigger>
                    <SelectContent>
                      {comicTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={newComic.status}
                    onValueChange={(value) =>
                      setNewComic((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {comicStatuses.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

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
                            checked={newComic.tags.includes(tag)}
                            onCheckedChange={() => handleTagToggle(tag)}
                          />
                          <Label htmlFor={`tag-${tag}`} className="text-sm">
                            {tag}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {newComic.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {newComic.tags.map((tag) => (
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

              <Button
                onClick={handleCreateComic}
                disabled={
                  !newComic.title ||
                  !newComic.thumbnailFile ||
                  !newComic.type ||
                  !!uploadError
                }
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Comic
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upload Chapters Tab */}
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload Chapters</CardTitle>
              <CardDescription>
                Add new chapters to an existing comic. Upload folders containing
                chapter images.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Select Comic</Label>
                {comicsLoading ? (
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : comicsError ? (
                  <div className="text-sm text-destructive">
                    Failed to load comics:{" "}
                    {comicsError.message || "Unknown error"}
                  </div>
                ) : comicsData?.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No comics found in database. Create a comic first.
                  </div>
                ) : (
                  <ComicComboBox
                    comics={
                      comicsData?.map((comic) => ({
                        id: comic.comic_id,
                        title: comic.comic_title,
                        chapters: comic.number_of_chapters,
                        status: comic.status,
                        type: comic.comic_type,
                      })) || []
                    }
                    value={uploadForm.comicId}
                    onValueChange={handleComicSelect}
                    placeholder="Choose a comic to upload chapters to"
                  />
                )}
              </div>

              {uploadForm.selectedComic && (
                <div className="space-y-2">
                  <Label>Upload Chapter Folders</Label>
                  <ChapterUpload
                    comicId={uploadForm.comicId}
                    comicTitle={uploadForm.selectedComic.comic_title}
                    comicType={uploadForm.selectedComic.comic_type}
                    onUploadComplete={handleChapterUploadComplete}
                    onUploadError={handleChapterUploadError}
                    disabled={!uploadForm.comicId}
                  />
                  <p className="text-sm text-muted-foreground">
                    Upload folders with structure like: chapter1/page01.jpg,
                    vol_02/img_03.png, etc. Folders must contain chapter
                    numbers, files must contain order numbers. Supported
                    formats: JPG, PNG, GIF, WebP
                  </p>
                </div>
              )}

              {uploadError && (
                <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
                  <p className="text-sm text-destructive">{uploadError}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delete Comic Tab */}
        <TabsContent value="delete-comic">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Delete Comic
              </CardTitle>
              <CardDescription>
                Permanently remove a comic and all its chapters from your
                library.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Select Comic to Delete</Label>
                <Select value={selectedComic} onValueChange={setSelectedComic}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a comic to delete" />
                  </SelectTrigger>
                  <SelectContent>
                    {comicsData?.map((comic) => (
                      <SelectItem
                        key={comic.comic_id}
                        value={comic.comic_id.toString()}
                      >
                        {comic.comic_title} ({comic.number_of_chapters}{" "}
                        chapters)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedComic && (
                <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
                  <p className="text-sm text-destructive font-medium">
                    Warning: This action cannot be undone. All chapters and
                    images for this comic will be permanently deleted.
                  </p>
                </div>
              )}

              <Button
                variant="destructive"
                onClick={handleDeleteComic}
                disabled={!selectedComic}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Comic Permanently
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delete Comic Chapters Tab */}
        <TabsContent value="delete-chapters">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Delete Comic Chapters
              </CardTitle>
              <CardDescription>
                Remove specific chapters from a comic while keeping the comic
                itself.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Select Comic</Label>
                <Select value={selectedComic} onValueChange={setSelectedComic}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a comic" />
                  </SelectTrigger>
                  <SelectContent>
                    {comicsData?.map((comic) => (
                      <SelectItem
                        key={comic.comic_id}
                        value={comic.comic_id.toString()}
                      >
                        {comic.comic_title} ({comic.number_of_chapters}{" "}
                        chapters)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedComic && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <Label>Select Chapters to Delete</Label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {mockChapters
                        .filter(
                          (chapter) =>
                            chapter.comic_id === parseInt(selectedComic)
                        )
                        .map((chapter) => (
                          <div
                            key={chapter.id}
                            className="flex items-center space-x-2 p-2 border rounded"
                          >
                            <Checkbox
                              id={`chapter-${chapter.id}`}
                              checked={selectedChapters.includes(chapter.id)}
                              onCheckedChange={() =>
                                toggleChapterSelection(chapter.id)
                              }
                            />
                            <Label
                              htmlFor={`chapter-${chapter.id}`}
                              className="flex-1"
                            >
                              Chapter {chapter.chapter_number}
                              {chapter.favorite && (
                                <Badge variant="secondary" className="ml-2">
                                  Favorite
                                </Badge>
                              )}
                            </Label>
                          </div>
                        ))}
                    </div>
                  </div>

                  {selectedChapters.length > 0 && (
                    <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
                      <p className="text-sm text-destructive font-medium">
                        Warning: {selectedChapters.length} chapter(s) will be
                        permanently deleted. This action cannot be undone.
                      </p>
                    </div>
                  )}

                  <Button
                    variant="destructive"
                    onClick={handleDeleteChapters}
                    disabled={selectedChapters.length === 0}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete {selectedChapters.length} Chapter(s)
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
