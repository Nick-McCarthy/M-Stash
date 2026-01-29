import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, BookOpen, Calendar } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface ComicDetailsCardProps {
  comic: {
    comic_title: string;
    thumbnail_address: string;
    number_of_chapters: number;
    views: number;
    updated_at: string;
    comic_type: string;
    status: string;
    comic_description?: string | null;
    genres?: string[];
    tags?: string[];
  };
}

export function ComicDetailsCard({ comic }: ComicDetailsCardProps) {
  const [imageError, setImageError] = useState(false);

  const formatViews = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <Card className="w-full lg:w-80 xl:w-96 flex-shrink-0 flex flex-col">
      <CardContent className="p-4 sm:p-6 flex flex-col flex-1 min-h-0">
        <div className="flex flex-col flex-1 min-h-0 space-y-4 sm:space-y-6">
          {/* Thumbnail */}
          <div className="flex justify-center flex-shrink-0">
            <div className="relative w-full max-w-xs sm:max-w-sm aspect-[2/3] overflow-hidden rounded-lg">
              <Image
                src={
                  comic.thumbnail_address && !imageError
                    ? comic.thumbnail_address
                    : "/placeholder-comic.svg"
                }
                alt={comic.comic_title}
                fill
                className="object-cover"
                onError={() => setImageError(true)}
              />
            </div>
          </div>

          {/* Comic Details */}
          <div className="flex flex-col flex-1 min-h-0 space-y-4">
            <div className="flex-shrink-0">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-center break-words">
                {comic.comic_title}
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center justify-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1 justify-center">
                  <BookOpen className="h-4 w-4" />
                  <span>{comic.number_of_chapters}</span>
                </div>
                <div className="flex items-center gap-1 justify-center">
                  <Eye className="h-4 w-4" />
                  <span>{formatViews(comic.views)}</span>
                </div>
                <div className="flex items-center gap-1 justify-center">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(comic.updated_at)}</span>
                </div>
              </div>
            </div>

            {/* Type and Status */}
            <div className="flex gap-2 justify-center flex-shrink-0">
              <Badge variant="secondary" className="capitalize">
                {comic.comic_type}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {comic.status}
              </Badge>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-2 -mr-2">
              {/* Description */}
              {comic.comic_description && (
                <div className="flex-shrink-0">
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed break-words">
                    {comic.comic_description}
                  </p>
                </div>
              )}

              {/* Genres */}
              {comic.genres && comic.genres.length > 0 && (
                <div className="flex-shrink-0">
                  <h3 className="font-semibold mb-2">Genres</h3>
                  <div className="flex flex-wrap gap-2">
                    {comic.genres.map((genre) => (
                      <Badge key={genre} variant="outline" className="text-xs">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {comic.tags && comic.tags.length > 0 && (
                <div className="flex-shrink-0">
                  <h3 className="font-semibold mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {comic.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
