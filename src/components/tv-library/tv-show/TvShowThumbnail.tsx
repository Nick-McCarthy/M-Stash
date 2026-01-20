import Image from "next/image";

interface TvShowThumbnailProps {
  thumbnailAddress: string;
  title: string;
}

export function TvShowThumbnail({
  thumbnailAddress,
  title,
}: TvShowThumbnailProps) {
  return (
    <div className="w-full md:w-64 flex-shrink-0">
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
        <Image
          src={thumbnailAddress || "/placeholder-comic.svg"}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 256px"
        />
      </div>
    </div>
  );
}

