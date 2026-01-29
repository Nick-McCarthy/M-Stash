"use client";

import Image from "next/image";
import { useRef, useEffect, useState } from "react";

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
  const [visibleImages, setVisibleImages] = useState<Set<number>>(new Set());
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const imageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Initialize visible images for above-the-fold content
  useEffect(() => {
    const initialVisible = new Set<number>();
    for (let i = 0; i < Math.min(5, images.length); i++) {
      initialVisible.add(i);
    }
    setVisibleImages(initialVisible);
  }, [images.length]);

  // Set up Intersection Observer for lazy loading
  useEffect(() => {
    if (typeof window === "undefined" || !window.IntersectionObserver) {
      return;
    }

    // Create observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(
              entry.target.getAttribute("data-image-index") || "0"
            );
            setVisibleImages((prev) => {
              const next = new Set(prev);
              // Preload current image and next 2 images
              for (let i = index; i < Math.min(index + 3, images.length); i++) {
                next.add(i);
              }
              return next;
            });
            // Unobserve once it's been seen (optional optimization)
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "200px", // Start loading 200px before image enters viewport
        threshold: 0.01,
      }
    );

    observerRef.current = observer;

    // Observe all image containers after refs are set
    const timeoutId = setTimeout(() => {
      Object.values(imageRefs.current).forEach((ref) => {
        if (ref) {
          observer.observe(ref);
        }
      });
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [images.length, images]);

  return (
    <div className="max-w-4xl mx-auto">
      {images.map((image, index) => {
        const imageSrc = image.image_path?.trim() || "/placeholder-comic.svg";
        const isVisible = visibleImages.has(index);
        const isLoaded = loadedImages.has(index);
        const isAboveFold = index < 5;

        return (
          <div
            key={`${image.chapter_id}-${image.image_ordering}`}
            className="relative min-h-[300px] bg-gray-100 dark:bg-gray-800"
            ref={(el) => {
              imageRefs.current[index] = el;
            }}
            data-image-index={index}
          >
            <div className="relative w-full border-l-2 border-r-2 border-gray-300">
              {/* Loading skeleton */}
              {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 animate-pulse">
                  <div className="w-full h-full bg-gray-200 dark:bg-gray-700" />
                </div>
              )}

              {/* Actual image - only render when visible */}
              {isVisible && (
                <Image
                  src={imageSrc}
                  alt={`${comicTitle} - Chapter ${chapterNumber} - Page ${
                    index + 1
                  }`}
                  width={800}
                  height={1200}
                  className={`w-full h-auto object-contain transition-opacity duration-300 ${
                    isLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  priority={isAboveFold}
                  loading={isAboveFold ? "eager" : "lazy"}
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
                    setLoadedImages((prev) => {
                      const next = new Set(prev);
                      next.add(index);
                      return next;
                    });
                  }}
                  onLoad={() => {
                    setLoadedImages((prev) => {
                      const next = new Set(prev);
                      next.add(index);
                      return next;
                    });
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
