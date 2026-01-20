import Link from "next/link";
import { Eye } from "lucide-react";

interface Episode {
  episode_id: number;
  episode_number: number;
  episode_title: string;
  views: number;
  updated_at: string;
}

interface EpisodeItemProps {
  episode: Episode;
  tvShowId: number;
}

export function EpisodeItem({ episode, tvShowId }: EpisodeItemProps) {
  return (
    <Link href={`/tv-library/${tvShowId}/${episode.episode_id}`}>
      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground min-w-[60px]">
              E{episode.episode_number.toString().padStart(2, "0")}
            </span>
            <span className="font-medium">{episode.episode_title}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            <span>{episode.views.toLocaleString()}</span>
          </div>
          <span>{new Date(episode.updated_at).toLocaleDateString()}</span>
        </div>
      </div>
    </Link>
  );
}

