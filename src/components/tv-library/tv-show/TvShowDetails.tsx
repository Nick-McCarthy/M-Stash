import { TvShowMetadata } from "./TvShowMetadata";
import { TvShowTags } from "./TvShowTags";

interface TvShowDetailsProps {
  title: string;
  description: string | null;
  views: number;
  updatedAt: string;
  tags: string[];
}

export function TvShowDetails({
  title,
  description,
  views,
  updatedAt,
  tags,
}: TvShowDetailsProps) {
  return (
    <div className="flex-1">
      <h1 className="text-3xl font-bold mb-4">{title}</h1>

      {description && (
        <p className="text-muted-foreground mb-4">{description}</p>
      )}

      <TvShowMetadata views={views} updatedAt={updatedAt} />

      <TvShowTags tags={tags} />
    </div>
  );
}

