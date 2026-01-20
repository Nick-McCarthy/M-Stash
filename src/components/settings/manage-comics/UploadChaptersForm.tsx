"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ComicComboBox } from "@/components/ui/comic-combo-box";
import { ChapterUpload } from "@/components/ui/chapter-upload";
import { useAllComics } from "@/hooks/useAllComics";

export function UploadChaptersForm() {
  const {
    comics: comicsData,
    isLoading: comicsLoading,
    error: comicsError,
  } = useAllComics();

  const [uploadForm, setUploadForm] = useState({
    comicId: "",
    selectedComic: null as any,
  });

  const [uploadError, setUploadError] = useState<string | null>(null);

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

  return (
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
              Failed to load comics: {comicsError.message || "Unknown error"}
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
              vol_02/img_03.png, etc. Folders must contain chapter numbers,
              files must contain order numbers. Supported formats: JPG, PNG,
              GIF, WebP
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
  );
}
