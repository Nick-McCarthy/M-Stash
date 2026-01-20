import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { EpisodeItem } from "./EpisodeItem";

interface Episode {
  episode_id: number;
  episode_number: number;
  episode_title: string;
  views: number;
  updated_at: string;
}

interface Season {
  season_number: number;
  episodes: Episode[];
}

interface SeasonItemProps {
  season: Season;
  tvShowId: number;
}

export function SeasonItem({ season, tvShowId }: SeasonItemProps) {
  return (
    <AccordionItem
      key={season.season_number}
      value={`season-${season.season_number}`}
    >
      <AccordionTrigger>
        <div className="flex items-center justify-between w-full pr-4">
          <span className="font-semibold">Season {season.season_number}</span>
          <span className="text-sm text-muted-foreground">
            {season.episodes.length} episode
            {season.episodes.length !== 1 ? "s" : ""}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-2">
          {season.episodes
            .sort((a, b) => a.episode_number - b.episode_number)
            .map((episode) => (
              <EpisodeItem
                key={episode.episode_id}
                episode={episode}
                tvShowId={tvShowId}
              />
            ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

