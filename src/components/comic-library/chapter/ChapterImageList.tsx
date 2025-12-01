import Image from "next/image";
import { useRef } from "react";

interface ChapterImage {
  chapter_id: number;
  image_ordering: number;
  image_path: string;
}

interface ChapterImageListProps {
  images: ChapterImage[];
  comicTitle: string;
  chapterNumber: number;
}

export function ChapterImageList({
  images,
  comicTitle,
  chapterNumber,
}: ChapterImageListProps) {
  const imageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  return (
    <div className="max-w-4xl mx-auto">
      {images.map((image, index) => {
        // All URLs in DB are now absolute, so use directly or fallback to placeholder
        const imageSrc = image.image_path?.trim() || "/placeholder-comic.svg";
        const isAboveFold = index < 5; // First 5 images are above the fold

        return (
          <div
            key={`${image.chapter_id}-${image.image_ordering}`}
            className="relative"
            ref={(el) => {
              imageRefs.current[index] = el;
            }}
            data-image-index={index}
          >
            <div className="relative w-full border-l-2 border-r-2 border-gray-300">
              <Image
                src={imageSrc}
                alt={`${comicTitle} - Chapter ${chapterNumber} - Page ${
                  index + 1
                }`}
                width={800}
                height={1200}
                className="w-full h-auto object-contain"
                priority={isAboveFold} // Prioritize first 5 images
                loading={isAboveFold ? "eager" : "lazy"} // Lazy load the rest
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  console.warn(
                    "Image failed to load:",
                    imageSrc,
                    "Falling back to placeholder"
                  );
                  if (target.src !== "/placeholder-comic.svg") {
                    target.src = "/placeholder-comic.svg";
                  }
                }}
                onLoad={() => {
                  console.log("Image loaded successfully:", imageSrc);
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
