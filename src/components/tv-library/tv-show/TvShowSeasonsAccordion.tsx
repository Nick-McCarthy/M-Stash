import { Accordion } from "@/components/ui/accordion";
import { SeasonItem } from "./SeasonItem";

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

interface TvShowSeasonsAccordionProps {
  seasons: Season[];
  tvShowId: number;
}

export function TvShowSeasonsAccordion({
  seasons,
  tvShowId,
}: TvShowSeasonsAccordionProps) {
  if (!seasons || seasons.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Seasons & Episodes</h2>
        <p className="text-muted-foreground">No episodes available.</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">Seasons & Episodes</h2>
      <Accordion type="single" collapsible className="w-full">
        {seasons
          .sort((a, b) => a.season_number - b.season_number)
          .map((season) => (
            <SeasonItem
              key={season.season_number}
              season={season}
              tvShowId={tvShowId}
            />
          ))}
      </Accordion>
    </div>
  );
}

