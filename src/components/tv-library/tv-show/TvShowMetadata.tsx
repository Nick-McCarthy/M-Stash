import { Eye, Calendar } from "lucide-react";

interface TvShowMetadataProps {
  views: number;
  updatedAt: string;
}

export function TvShowMetadata({ views, updatedAt }: TvShowMetadataProps) {
  return (
    <div className="flex flex-wrap gap-4 mb-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Eye className="h-4 w-4" />
        <span>{views.toLocaleString()} views</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>Updated {new Date(updatedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

