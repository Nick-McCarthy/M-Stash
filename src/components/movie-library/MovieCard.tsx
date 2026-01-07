import { Card, CardContent } from "@/components/ui/card";
import { Eye, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";

interface MovieCardProps {
  id: string;
  title: string;
  thumbnail: string;
  views: number;
  updatedAt: string;
}

export default function MovieCard({
  id,
  title,
  thumbnail,
  views,
  updatedAt,
}: MovieCardProps) {
  const [imageSrc, setImageSrc] = useState<string>(
    thumbnail && thumbnail.trim() !== "" ? thumbnail : "/placeholder-movie.svg"
  );

  useEffect(() => {
    setImageSrc(
      thumbnail && thumbnail.trim() !== ""
        ? thumbnail
        : "/placeholder-movie.svg"
    );
  }, [thumbnail]);

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
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  return (
    <Link href={`/movie-library/${id}`} className="block">
      <Card className="group overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.02] p-0 cursor-pointer h-full">
      <div className="relative aspect-[2/3] overflow-hidden">
        <Image
          src={imageSrc}
          alt={title}
          fill
          className="object-cover transition-transform duration-200 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onError={() => {
            setImageSrc("/placeholder-movie.svg");
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </div>

      <CardContent className="pt-4 pb-4">
        <h3 className="font-semibold text-lg leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            <span>{formatViews(views)}</span>
          </div>

          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{formatDate(updatedAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
    </Link>
  );
}
