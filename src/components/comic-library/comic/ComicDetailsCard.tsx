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
    comic_description?: string;
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
    <Card className="w-fit mx-auto lg:mx-0 lg:w-80 lg:flex lg:flex-col">
      <CardContent className="p-6 lg:flex-1 lg:flex lg:flex-col">
        <div className="space-y-6 lg:flex-1 lg:flex lg:flex-col">
          {/* Thumbnail */}
          <div className="flex justify-center flex-shrink-0">
            <div className="relative w-64 h-96 overflow-hidden rounded-lg">
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
          <div className="space-y-4 lg:flex-1">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-center">
                {comic.comic_title}
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center justify-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  <span>{comic.number_of_chapters}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{formatViews(comic.views)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(comic.updated_at)}</span>
                </div>
              </div>
            </div>

            {/* Type and Status */}
            <div className="flex gap-2 justify-center">
              <Badge variant="secondary" className="capitalize">
                {comic.comic_type}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {comic.status}
              </Badge>
            </div>

            {/* Description */}
            {comic.comic_description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {comic.comic_description}
                </p>
              </div>
            )}

            {/* Genres */}
            {comic.genres && comic.genres.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {comic.genres.map((genre) => (
                    <Badge key={genre} variant="outline">
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {comic.tags && comic.tags.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {comic.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
