interface TvShowTagsProps {
  tags: string[];
}

export function TvShowTags({ tags }: TvShowTagsProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

