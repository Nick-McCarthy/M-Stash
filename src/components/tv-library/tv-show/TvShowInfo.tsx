import { TvShowThumbnail } from "./TvShowThumbnail";
import { TvShowDetails } from "./TvShowDetails";

interface TvShowInfoProps {
  thumbnailAddress: string;
  title: string;
  description: string | null;
  views: number;
  updatedAt: string;
  tags: string[];
}

export function TvShowInfo({
  thumbnailAddress,
  title,
  description,
  views,
  updatedAt,
  tags,
}: TvShowInfoProps) {
  return (
    <div className="flex flex-col md:flex-row gap-6 mb-8">
      <TvShowThumbnail thumbnailAddress={thumbnailAddress} title={title} />
      <TvShowDetails
        title={title}
        description={description}
        views={views}
        updatedAt={updatedAt}
        tags={tags}
      />
    </div>
  );
}

