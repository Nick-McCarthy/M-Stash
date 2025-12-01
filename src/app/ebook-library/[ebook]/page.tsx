"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Book, Rendition } from "epubjs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  BookOpen,
  Bookmark,
  BookmarkPlus,
  Menu,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { NavItem } from "epubjs";
import { useTheme } from "next-themes";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Ebook {
  id: number;
  title: string;
  author: string;
  address: string;
  bookmarks: Bookmark[];
}

interface Bookmark {
  bookmark_id: number;
  bookmark_name: string;
  chapter_title: string | null;
  cfi: string | null; // CFI string - the recommended way to store EPUB locations
  position_percentage: number | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface LocationChangeEvent {
  start: {
    cfi: string;
    href: string;
    percentage: number;
  };
  end: {
    cfi: string;
    href: string;
    percentage: number;
  };
}

async function fetchEbook(id: number): Promise<Ebook> {
  const response = await fetch(`/api/ebook-library/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch ebook");
  }
  return response.json();
}

async function createBookmark(
  ebookId: number,
  bookmarkName: string,
  chapterTitle: string | null,
  cfi: string,
  positionPercentage?: number
): Promise<Bookmark> {
  const response = await fetch(`/api/ebook-library/${ebookId}/bookmarks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bookmark_name: bookmarkName,
      chapter_title: chapterTitle || undefined,
      cfi: cfi,
      position_percentage: positionPercentage,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create bookmark");
  }

  return response.json();
}

export default function EbookReaderPage() {
  const params = useParams();
  const router = useRouter();
  const { theme } = useTheme();
  const ebookId = parseInt(params.ebook as string);
  const queryClient = useQueryClient();
  const viewerRef = useRef<HTMLDivElement>(null);

  const [book, setBook] = useState<Book | null>(null);
  const [rendition, setRendition] = useState<Rendition | null>(null);
  const [chapters, setChapters] = useState<NavItem[]>([]);
  const [currentLocation, setCurrentLocation] = useState<string>("");
  const [currentPercentage, setCurrentPercentage] = useState<number>(0);
  const [currentChapter, setCurrentChapter] = useState<string | null>(null);
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false);
  const [bookmarkDrawerOpen, setBookmarkDrawerOpen] = useState(false);
  const [chaptersDrawerOpen, setChaptersDrawerOpen] = useState(false);
  const [bookmarkName, setBookmarkName] = useState("");

  const {
    data: ebook,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["ebook", ebookId],
    queryFn: () => fetchEbook(ebookId),
  });

  const createBookmarkMutation = useMutation({
    mutationFn: ({
      bookmarkName,
      chapterTitle,
      cfi,
      positionPercentage,
    }: {
      bookmarkName: string;
      chapterTitle: string | null;
      cfi: string;
      positionPercentage?: number;
    }) =>
      createBookmark(
        ebookId,
        bookmarkName,
        chapterTitle,
        cfi,
        positionPercentage
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ebook", ebookId] });
      setBookmarkDialogOpen(false);
      setBookmarkName("");
    },
  });

  const initializeThemes = (rendition: Rendition) => {
    rendition.themes.register("light", {
      body: {
        color: "#1a1a1a",
        background: "#ffffff",
      },
    });

    rendition.themes.register("dark", {
      body: {
        color: "#e5e5e5",
        background: "#1a1a1a",
      },
    });
  };

  // Initialize the EPUB book
  useEffect(() => {
    if (!ebook || !viewerRef.current) return;

    const initBook = async (): Promise<void> => {
      try {
        const ebookUrl = `/api/ebook-library/${ebookId}/proxy`;
        const newBook = new Book(ebookUrl);
        
        // Configure epubjs to route internal resources through our API
        newBook.loaded.resources = newBook.loaded.resources || {};
        
        await newBook.ready;
        setBook(newBook);

        if (viewerRef.current) {
          const newRendition = newBook.renderTo(viewerRef.current, {
            width: "100%",
            height: "100%",
            spread: "none",
            allowScriptedContent: false, // Disable scripts for security (most EPUBs don't need them)
          });
          setRendition(newRendition);

          initializeThemes(newRendition);
          newRendition.themes.select(theme === "dark" ? "dark" : "light");

          // Get table of contents
          const nav = await newBook.navigation;
          setChapters(nav.toc || []);

          // Display the book
          await newRendition.display();

          // Listen to location changes for bookmark tracking
          // The locationChanged event provides percentage directly
          newRendition.on(
            "locationChanged",
            (location: LocationChangeEvent) => {
              if (location && location.start) {
                setCurrentLocation(location.start.cfi);
                // percentage is already 0-1, convert to 0-100
                const percentage =
                  location.start.percentage !== undefined &&
                  location.start.percentage !== null
                    ? location.start.percentage * 100
                    : 0;
                setCurrentPercentage(percentage);
                setCurrentChapter(location.start.href || null);
              }
            }
          );
        }
      } catch (error) {
        console.error("Error initializing epub:", error);
      }
    };

    initBook();

    return () => {
      if (book) {
        book.destroy();
      }
    };
  }, [ebook, ebookId, theme]);

  // Update theme when it changes
  useEffect(() => {
    if (rendition) {
      rendition.themes.select(theme === "dark" ? "dark" : "light");
    }
  }, [theme, rendition]);

  const handleCreateBookmark = () => {
    if (!bookmarkName.trim()) {
      return;
    }

    // Validate CFI before creating bookmark
    if (!currentLocation || typeof currentLocation !== "string") {
      alert(
        "Unable to determine reading position. Please wait a moment for the page to fully load, then try again."
      );
      return;
    }

    createBookmarkMutation.mutate({
      bookmarkName: bookmarkName.trim(),
      chapterTitle: currentChapter,
      cfi: currentLocation, // Use CFI directly - the recommended way
      positionPercentage:
        currentPercentage > 0
          ? Math.round(currentPercentage * 100) / 100
          : undefined,
    });
  };

  const handleNavigateToBookmark = async (bookmark: Bookmark) => {
    if (!rendition) {
      console.error("Cannot navigate: Rendition not available");
      return;
    }

    // Use CFI directly if available - the recommended and most reliable method
    if (bookmark.cfi) {
      try {
        await rendition.display(bookmark.cfi);
        return;
      } catch (error) {
        console.error("Error navigating to bookmark CFI:", error);
        // Fall through to percentage-based navigation as fallback
      }
    }

    // Fallback: Use percentage if CFI is not available (backward compatibility)
    if (
      bookmark.position_percentage &&
      bookmark.position_percentage > 0 &&
      book &&
      book.locations
    ) {
      try {
        // Generate locations if needed
        const locationsArray = Array.isArray(book.locations)
          ? book.locations
          : [];
        if (locationsArray.length === 0) {
          await book.locations.generate(200);
        }

        // Convert percentage (0-100) to decimal (0-1)
        const percentage = bookmark.position_percentage / 100;

        // Get CFI from percentage - try after ensuring locations are generated
        await new Promise((resolve) => setTimeout(resolve, 100)); // Brief delay for generation

        try {
          const cfi = book.locations.cfiFromPercentage(percentage);
          if (cfi) {
            await rendition.display(cfi);
            return;
          }
        } catch (cfiError) {
          console.error("Error getting CFI from percentage:", cfiError);
        }
      } catch (error) {
        console.error("Error navigating to bookmark via percentage:", error);
      }
    }

    alert(
      "Could not navigate to bookmark. The bookmark position may be invalid."
    );
  };

  const handleNavigateToChapter = (href: string) => {
    if (rendition) {
      rendition.display(href);
      setChaptersDrawerOpen(false);
    }
  };

  const handleNextPage = () => {
    if (rendition) {
      rendition.next();
    }
  };

  const handlePrevPage = () => {
    if (rendition) {
      rendition.prev();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keyboard events if user is typing in an input/dialog
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLButtonElement
      ) {
        return;
      }

      if (!rendition) return;

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          rendition.next();
          break;
        case "ArrowLeft":
          e.preventDefault();
          rendition.prev();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [rendition]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <BookOpen className="h-12 w-12 animate-pulse mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading ebook...</p>
        </div>
      </div>
    );
  }

  if (error || !ebook) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">
            {error instanceof Error ? error.message : "Failed to load ebook"}
          </p>
          <Button onClick={() => router.push("/ebook-library")}>
            Back to Library
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background">
        <div className="px-4 py-3 lg:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/">Home</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/ebook-library">
                        Ebook Library
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{ebook.title}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                <h1 className="text-lg font-semibold mt-1">{ebook.title}</h1>
                <p className="text-sm text-muted-foreground">{ebook.author}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Dialog
                open={bookmarkDialogOpen}
                onOpenChange={setBookmarkDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <BookmarkPlus className="h-4 w-4 mr-2" />
                    Add Bookmark
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Bookmark</DialogTitle>
                    <DialogDescription>
                      Save your current reading position as a bookmark.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="bookmark-name">Bookmark Name</Label>
                      <Input
                        id="bookmark-name"
                        placeholder="e.g., Important section"
                        value={bookmarkName}
                        onChange={(e) => setBookmarkName(e.target.value)}
                      />
                    </div>
                    {currentChapter && (
                      <div className="text-sm text-muted-foreground">
                        Current Chapter: {currentChapter}
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground">
                      Position:{" "}
                      {currentPercentage > 0
                        ? currentPercentage.toFixed(1) + "%"
                        : "Calculating..."}
                    </div>
                    {currentPercentage === 0 && (
                      <div className="text-xs text-amber-500 mt-2">
                        Please wait for the reading position to load before
                        creating a bookmark.
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setBookmarkDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateBookmark}
                      disabled={
                        !bookmarkName.trim() || createBookmarkMutation.isPending
                      }
                    >
                      {createBookmarkMutation.isPending
                        ? "Creating..."
                        : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Drawer
                open={chaptersDrawerOpen}
                onOpenChange={setChaptersDrawerOpen}
                direction="right"
              >
                <DrawerTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Menu className="h-4 w-4 mr-2" />
                    Chapters
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="h-full">
                  <DrawerHeader>
                    <DrawerTitle>Table of Contents</DrawerTitle>
                    <DrawerDescription>
                      Navigate to a specific chapter
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="flex-1 overflow-y-auto p-4">
                    {chapters && chapters.length > 0 ? (
                      <ScrollArea className="h-full">
                        <div className="space-y-1">
                          {chapters.map((chapter, index) => (
                            <button
                              key={index}
                              onClick={() =>
                                handleNavigateToChapter(chapter.href)
                              }
                              className={`w-full text-left px-4 py-3 rounded-md transition-colors border border-border ${
                                currentLocation &&
                                currentChapter === chapter.href
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-accent hover:text-accent-foreground"
                              }`}
                            >
                              <div className="font-medium">{chapter.label}</div>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No chapters available in this book.
                      </p>
                    )}
                  </div>
                </DrawerContent>
              </Drawer>

              <Drawer
                open={bookmarkDrawerOpen}
                onOpenChange={setBookmarkDrawerOpen}
                direction="right"
              >
                <DrawerTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Bookmark className="h-4 w-4 mr-2" />
                    Bookmarks ({ebook?.bookmarks.length || 0})
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="h-full">
                  <DrawerHeader>
                    <DrawerTitle>Bookmarks</DrawerTitle>
                    <DrawerDescription>
                      Navigate to your saved reading positions
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="flex-1 overflow-y-auto p-4">
                    {ebook && ebook.bookmarks.length > 0 ? (
                      <ScrollArea className="h-full">
                        <div className="space-y-2">
                          {ebook.bookmarks.map((bookmark) => (
                            <button
                              key={bookmark.bookmark_id}
                              onClick={() => {
                                handleNavigateToBookmark(bookmark);
                                setBookmarkDrawerOpen(false);
                              }}
                              className="w-full text-left px-4 py-3 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors border border-border"
                            >
                              <div className="font-medium">
                                {bookmark.bookmark_name}
                              </div>
                              {bookmark.chapter_title && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  {bookmark.chapter_title}
                                </div>
                              )}
                              {bookmark.position_percentage && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  {bookmark.position_percentage.toFixed(1)}%
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No bookmarks yet. Create one using the "Add Bookmark"
                        button.
                      </p>
                    )}
                  </div>
                </DrawerContent>
              </Drawer>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Reader */}
        <div className="flex-1 relative flex justify-center h-full">
          <div className="w-full max-w-[800px] h-full relative">
            <div
              ref={viewerRef}
              className="w-full h-full"
              style={{
                backgroundColor: theme === "dark" ? "#1a1a1a" : "#ffffff",
              }}
            />

            {/* Left click area for previous page */}
            <div
              className="absolute left-0 top-0 w-1/3 h-full cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              onClick={handlePrevPage}
              aria-label="Previous page"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handlePrevPage();
                }
              }}
            />

            {/* Right click area for next page */}
            <div
              className="absolute right-0 top-0 w-1/3 h-full cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              onClick={handleNextPage}
              aria-label="Next page"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleNextPage();
                }
              }}
            />

            {/* Navigation buttons (optional, for visual feedback) */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevPage}
                className="bg-background/80 backdrop-blur-sm"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextPage}
                className="bg-background/80 backdrop-blur-sm"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
