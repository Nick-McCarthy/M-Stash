"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useChapter, useToggleChapterFavorite } from "@/lib/queries/comics";
import { ChapterNavigation } from "@/components/comic-library/chapter/ChapterNavigation";
import { ChapterPageSkeleton } from "@/components/comic-library/chapter/ChapterPageSkeleton";
import { ChapterHeader } from "@/components/comic-library/chapter/ChapterHeader";
import { ChapterImageList } from "@/components/comic-library/chapter/ChapterImageList";
import { ScrollToTopButton } from "@/components/comic-library/chapter/ScrollToTopButton";
import { ErrorState } from "@/components/comic-library/chapter/ErrorState";
import { useDebouncedCallback } from "@/hooks/useDebounce";

export default function ChapterPage() {
  const params = useParams();
  const router = useRouter();
  const comicId = parseInt(params.comic as string);
  const chapterNumber = parseFloat(params.chapter as string);

  const {
    data: chapterData,
    isLoading,
    error,
  } = useChapter(comicId, chapterNumber);

  const toggleFavoriteMutation = useToggleChapterFavorite();

  // Debounced favorite toggle to prevent spam clicking
  const debouncedToggleFavorite = useDebouncedCallback(
    (isFavorited: boolean) => {
      if (chapterData) {
        toggleFavoriteMutation.mutate({
          comicId,
          chapterNumber,
          favorite: isFavorited,
        });
      }
    },
    300 // 300ms debounce delay
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!chapterData || Number.isNaN(comicId) || Number.isNaN(chapterNumber)) {
      return;
    }

    const cooldownMs = 20 * 60 * 1000; // 20 minutes
    const storageKey = "ml-comic-view-timestamps";

    const recordView = async () => {
      const now = Date.now();

      try {
        const stored = window.localStorage.getItem(storageKey);
        const timestamps: Record<string, number> = stored
          ? JSON.parse(stored)
          : {};
        const lastViewed = timestamps[String(comicId)] ?? 0;

        if (now - lastViewed < cooldownMs) {
          return;
        }

        const response = await fetch(
          `/api/comic-library/${comicId}/${chapterNumber}/views`,
          { method: "POST" }
        );

        if (!response.ok) {
          console.error(
            "Failed to record comic view",
            await response.json().catch(() => undefined)
          );
          return;
        }

        timestamps[String(comicId)] = now;
        window.localStorage.setItem(storageKey, JSON.stringify(timestamps));
      } catch (error) {
        console.error("Error tracking comic view", error);
      }
    };

    void recordView();
  }, [chapterData, comicId, chapterNumber]);

  if (isLoading) {
    return <ChapterPageSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        title="Error Loading Chapter"
        message={error instanceof Error ? error.message : "An error occurred"}
        onBack={() => router.back()}
      />
    );
  }

  if (!chapterData) {
    return (
      <ErrorState title="Chapter Not Found" onBack={() => router.back()} />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Chapter Header - Breadcrumb and Title */}
        <ChapterHeader
          comicId={comicId}
          comicTitle={chapterData.comic.comic_title}
          chapterNumber={chapterData.chapter.chapter_number}
        />

        {/* Navigation Controls */}
        <div className="flex justify-center mb-8">
          <ChapterNavigation
            comicId={comicId}
            chapterData={chapterData}
            onToggleFavorite={debouncedToggleFavorite}
          />
        </div>

        {/* Chapter Images */}
        <ChapterImageList
          images={chapterData.images}
          comicTitle={chapterData.comic.comic_title}
          chapterNumber={chapterData.chapter.chapter_number}
        />
      </div>

      {/* Bottom Navigation */}
      <div className="pb-8">
        <div className="flex justify-center">
          <ChapterNavigation
            comicId={comicId}
            chapterData={chapterData}
            onToggleFavorite={debouncedToggleFavorite}
          />
        </div>
      </div>

      {/* Scroll to Top Button */}
      <ScrollToTopButton threshold={300} />
    </div>
  );
}
