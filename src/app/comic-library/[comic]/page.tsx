"use client";

import { useParams, useRouter } from "next/navigation";
import { useComic } from "@/lib/queries/comics";
import { ComicPageSkeleton } from "@/components/comic-library/comic/ComicPageSkeleton";
import { ComicHeader } from "@/components/comic-library/comic/ComicHeader";
import { ComicDetailsCard } from "@/components/comic-library/comic/ComicDetailsCard";
import { ChaptersListCard } from "@/components/comic-library/comic/ChaptersListCard";
import { ErrorState } from "@/components/comic-library/chapter/ErrorState";

export default function ComicPage() {
  const params = useParams();
  const router = useRouter();
  const comicId = parseInt(params.comic as string);

  const { data: comic, isLoading, error } = useComic(comicId);

  if (isLoading) {
    return <ComicPageSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        title="Error Loading Comic"
        message={error instanceof Error ? error.message : "An error occurred"}
        onBack={() => router.push("/comic-library")}
      />
    );
  }

  if (!comic) {
    return (
      <ErrorState
        title="Comic Not Found"
        onBack={() => router.push("/comic-library")}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8 max-w-7xl">
      {/* Breadcrumb */}
      <ComicHeader comicTitle={comic.comic_title} />

      {/* Main Content Layout */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-center lg:items-stretch justify-center">
        {/* Comic Details Card */}
        <ComicDetailsCard comic={comic} />

        {/* Chapters List */}
        <ChaptersListCard comicId={comic.comic_id} chapters={comic.chapters ?? []} />
      </div>
    </div>
  );
}
