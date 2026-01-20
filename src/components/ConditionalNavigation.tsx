"use client";

import { usePathname } from "next/navigation";
import { Navigation } from "@/components/NavigationBar";

export function ConditionalNavigation() {
  const pathname = usePathname();
  
  // Hide navigation on full-screen media pages
  const isMoviePlayerPage = pathname?.match(/^\/movie-library\/\d+$/);
  const isTvEpisodePage = pathname?.match(/^\/tv-library\/[^/]+\/\d+$/);
  const isEbookReaderPage = pathname?.match(/^\/ebook-library\/\d+$/);
  
  if (isMoviePlayerPage || isTvEpisodePage || isEbookReaderPage) {
    return null;
  }
  
  return <Navigation />;
}

