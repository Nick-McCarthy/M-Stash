"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FavoriteButton } from "@/components/FavoriteButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useComic } from "@/lib/queries/comics";

interface ChapterNavigationProps {
  comicId: number;
  chapterData: {
    chapter: {
      chapter_number: number;
      prev_chapter: number | null;
      next_chapter: number | null;
      favorite: boolean;
    };
  };
  onToggleFavorite: (isFavorited: boolean) => void;
}

export function ChapterNavigation({
  comicId,
  chapterData,
  onToggleFavorite,
}: ChapterNavigationProps) {
  const router = useRouter();
  const { data: comicData, isLoading: isComicLoading } = useComic(comicId);

  const chapters = useMemo(() => {
    if (!comicData?.chapters) {
      return [];
    }

    return [...comicData.chapters].sort(
      (a, b) => a.chapter_number - b.chapter_number
    );
  }, [comicData]);

  const hasPrevChapter =
    chapterData?.chapter.prev_chapter !== null &&
    chapterData?.chapter.prev_chapter !== undefined;
  const hasNextChapter =
    chapterData?.chapter.next_chapter !== null &&
    chapterData?.chapter.next_chapter !== undefined;

  const prevChapterUrl = hasPrevChapter
    ? `/comic-library/${comicId}/${chapterData.chapter.prev_chapter}`
    : null;
  const nextChapterUrl = hasNextChapter
    ? `/comic-library/${comicId}/${chapterData.chapter.next_chapter}`
    : null;
  const homeUrl = `/comic-library/${comicId}`;
  const currentChapterValue = chapterData.chapter.chapter_number.toString();

  const handleChapterChange = (value: string) => {
    router.push(`/comic-library/${comicId}/${value}`);
  };

  return (
    <div className="space-y-4">
      {/* Chapter Select */}
      <div className="flex justify-center">
        <Select value={currentChapterValue} onValueChange={handleChapterChange}>
          <SelectTrigger
            className="w-full max-w-xs"
            disabled={isComicLoading || chapters.length === 0}
            aria-label="Select chapter"
          >
            <SelectValue placeholder="Jump to chapter" />
          </SelectTrigger>
          <SelectContent>
            {chapters.map((chapter) => {
              const chapterNumber = chapter.chapter_number;

              return (
                <SelectItem
                  key={chapter.chapter_id}
                  value={chapterNumber.toString()}
                >
                  {`Chapter ${chapterNumber}`}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-center gap-4">
        {/* Previous Chapter Button */}
        {prevChapterUrl ? (
          <Button variant="outline" className="flex items-center gap-2" asChild>
            <Link href={prevChapterUrl}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        {/* Home Button */}
        <Button variant="outline" className="flex items-center gap-2" asChild>
          <Link href={homeUrl}>
            <Home className="h-4 w-4" />
          </Link>
        </Button>

        {/* Next Chapter Button */}
        {nextChapterUrl ? (
          <Button variant="outline" className="flex items-center gap-2" asChild>
            <Link href={nextChapterUrl}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled
            className="flex items-center gap-2"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Favorite Button */}
      <div className="flex justify-center">
        <FavoriteButton
          defaultFavorited={chapterData.chapter.favorite}
          onToggle={onToggleFavorite}
          size="md"
        />
      </div>
    </div>
  );
}
