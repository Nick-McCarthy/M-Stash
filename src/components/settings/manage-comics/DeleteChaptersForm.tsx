"use client";

import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, AlertTriangle } from "lucide-react";
import { useAllComics } from "@/hooks/useAllComics";

export function DeleteChaptersForm() {
  const {
    comics: comicsData,
    isLoading: comicsLoading,
    error: comicsError,
  } = useAllComics();

  const [selectedComic, setSelectedComic] = useState<string>("");
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
  const [chapters, setChapters] = useState<
    Array<{
      chapter_id: number;
      chapter_number: number;
      favorite: boolean;
    }>
  >([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [chaptersError, setChaptersError] = useState<string | null>(null);

  // Fetch chapters when a comic is selected
  useEffect(() => {
    const fetchChapters = async () => {
      if (!selectedComic) {
        setChapters([]);
        setSelectedChapters([]);
        return;
      }

      try {
        setChaptersLoading(true);
        setChaptersError(null);
        setSelectedChapters([]);

        const response = await fetch(`/api/comic-library/${selectedComic}`);
        if (!response.ok) {
          throw new Error("Failed to fetch chapters");
        }

        const data = await response.json();
        setChapters(data.chapters || []);
      } catch (err) {
        console.error("Error fetching chapters:", err);
        setChaptersError(
          err instanceof Error ? err.message : "Failed to load chapters"
        );
        setChapters([]);
      } finally {
        setChaptersLoading(false);
      }
    };

    fetchChapters();
  }, [selectedComic]);

  const toggleChapterSelection = (chapterId: number) => {
    setSelectedChapters((prev) =>
      prev.includes(chapterId)
        ? prev.filter((id) => id !== chapterId)
        : [...prev, chapterId]
    );
  };

  const handleDeleteChapters = async () => {
    if (selectedChapters.length === 0) {
      return;
    }

    try {
      setChaptersError(null);

      const response = await fetch(
        "/api/settings/manage-comics/delete-chapters",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chapter_ids: selectedChapters,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || errorData.details || "Failed to delete chapters"
        );
      }

      const result = await response.json();
      alert(`Successfully deleted ${result.deleted_count} chapter(s)!`);

      setSelectedChapters([]);
      if (selectedComic) {
        const refreshResponse = await fetch(
          `/api/comic-library/${selectedComic}`
        );
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          setChapters(refreshData.chapters || []);
        }
      }
    } catch (error) {
      console.error("Failed to delete chapters:", error);
      setChaptersError(
        error instanceof Error ? error.message : "Failed to delete chapters"
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Delete Comic Chapters
        </CardTitle>
        <CardDescription>
          Remove specific chapters from a comic while keeping the comic itself.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Select Comic</Label>
          {comicsLoading ? (
            <div className="text-sm text-muted-foreground">
              Loading comics...
            </div>
          ) : comicsError ? (
            <div className="text-sm text-destructive">
              Failed to load comics. Please try again.
            </div>
          ) : (
            <Select
              value={selectedComic}
              onValueChange={setSelectedComic}
              disabled={chaptersLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a comic" />
              </SelectTrigger>
              <SelectContent>
                {comicsData?.map((comic) => (
                  <SelectItem
                    key={comic.comic_id}
                    value={comic.comic_id.toString()}
                  >
                    {comic.comic_title} ({comic.number_of_chapters} chapters)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {selectedComic && (
          <>
            <Separator />
            <div className="space-y-4">
              <Label>Select Chapters to Delete</Label>
              {chaptersLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : chaptersError ? (
                <div className="text-sm text-destructive">{chaptersError}</div>
              ) : chapters.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No chapters found for this comic.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {chapters.map((chapter) => (
                    <div
                      key={chapter.chapter_id}
                      className="flex items-center space-x-2 p-2 border rounded"
                    >
                      <Checkbox
                        id={`chapter-${chapter.chapter_id}`}
                        checked={selectedChapters.includes(chapter.chapter_id)}
                        onCheckedChange={() =>
                          toggleChapterSelection(chapter.chapter_id)
                        }
                      />
                      <Label
                        htmlFor={`chapter-${chapter.chapter_id}`}
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
              )}
            </div>

            {chaptersError && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm">{chaptersError}</p>
              </div>
            )}

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
              disabled={selectedChapters.length === 0 || chaptersLoading}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete {selectedChapters.length} Chapter(s)
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
