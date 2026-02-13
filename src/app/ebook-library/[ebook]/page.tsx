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
  Trash2,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import type { NavItem } from "epubjs";
import { useTheme } from "next-themes";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

async function deleteBookmark(
  ebookId: number,
  bookmarkId: number
): Promise<void> {
  const response = await fetch(
    `/api/ebook-library/${ebookId}/bookmarks?bookmarkId=${bookmarkId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to delete bookmark");
  }
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
  const [fullTOC, setFullTOC] = useState<NavItem[]>([]); // Store full TOC for navigation
  const [currentLocation, setCurrentLocation] = useState<string>("");
  const [currentPercentage, setCurrentPercentage] = useState<number>(0);
  const [currentChapter, setCurrentChapter] = useState<string | null>(null);
  const [currentChapterLabel, setCurrentChapterLabel] = useState<string | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
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

  const deleteBookmarkMutation = useMutation({
    mutationFn: (bookmarkId: number) => deleteBookmark(ebookId, bookmarkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ebook", ebookId] });
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
            flow: "paginated", // Better for mobile - single page view
            manager: "default",
          });
          setRendition(newRendition);

          initializeThemes(newRendition);
          newRendition.themes.select(theme === "dark" ? "dark" : "light");

          // Get navigation data
          const nav = await newBook.navigation;
          
          // Helper function to find chapter label by href (including nested chapters)
          const findChapterLabel = (href: string, chapterList: NavItem[]): string | null => {
            for (const chapter of chapterList) {
              if (chapter.href === href) {
                return chapter.label;
              }
              if (chapter.subitems && chapter.subitems.length > 0) {
                const found = findChapterLabel(href, chapter.subitems);
                if (found) return found;
              }
            }
            return null;
          };

          // Helper to filter out frontmatter/backmatter from TOC
          const filterTOC = (toc: NavItem[]): NavItem[] => {
            const frontmatterKeywords = [
              "title page",
              "imprint",
              "copyright",
              "dedication",
              "preface",
              "foreword",
              "introduction",
              "acknowledgments",
              "dramatis personae",
              "colophon",
              "table of contents",
            ];
            
            const backmatterKeywords = [
              "index",
              "glossary",
              "appendix",
              "about the author",
              "about the publisher",
            ];

            const isFrontmatterOrBackmatter = (label: string): boolean => {
              const lowerLabel = label.toLowerCase();
              return (
                frontmatterKeywords.some((keyword) =>
                  lowerLabel.includes(keyword)
                ) ||
                backmatterKeywords.some((keyword) =>
                  lowerLabel.includes(keyword)
                )
              );
            };

            const filterItems = (items: NavItem[]): NavItem[] => {
              return items
                .filter((item) => !isFrontmatterOrBackmatter(item.label))
                .map((item) => ({
                  ...item,
                  subitems: item.subitems
                    ? filterItems(item.subitems)
                    : undefined,
                }))
                .filter((item) => {
                  // Keep item if it has subitems (even if filtered) or if it's not front/backmatter
                  return (
                    (item.subitems && item.subitems.length > 0) ||
                    !isFrontmatterOrBackmatter(item.label)
                  );
                });
            };

            return filterItems(toc);
          };

          // Try to get chapters from landmarks first (best for actual chapter detection)
          // Landmarks have semantic types like "chapter", "scene", "section", etc.
          let chapters: NavItem[] = [];
          
          if (nav.landmarks && nav.landmarks.length > 0) {
            // Filter landmarks to only include chapter-like types
            const chapterTypes = [
              "chapter",
              "text",
              "section",
              "scene",
              "part",
              "subchapter",
            ];
            
            const landmarkChapters = nav.landmarks
              .filter(
                (landmark: any) =>
                  landmark.type &&
                  chapterTypes.some((type) =>
                    landmark.type.toLowerCase().includes(type)
                  )
              )
              .map((landmark: any, index: number) => ({
                id: landmark.id || landmark.href || `landmark-${index}`,
                label: landmark.label || "Untitled Chapter",
                href: landmark.href,
                subitems: undefined,
              }));

            if (landmarkChapters.length > 0) {
              chapters = landmarkChapters;
            }
          }

          // Fallback to filtered TOC if landmarks don't have good chapters
          if (chapters.length === 0 && nav.toc && nav.toc.length > 0) {
            const filteredTOC = filterTOC(nav.toc);
            // Only use filtered TOC if it has substantial content (more than just a few items)
            if (filteredTOC.length > 3) {
              chapters = filteredTOC;
            } else {
              // If filtering removed too much, use full TOC but still try to prioritize chapters
              chapters = nav.toc;
            }
          }

          // Final fallback: use full TOC if nothing else works
          if (chapters.length === 0) {
            chapters = nav.toc || [];
          }

          // Helper function to fix navigation mismatches
          // Some EPUBs have incorrect hrefs in their navigation (e.g., Act I scenes pointing to Act V)
          const fixNavigationMismatches = (items: NavItem[], parentHref?: string): NavItem[] => {
            return items.map((item) => {
              const fixedItem = { ...item };
              
              // If this item has a parent with an href, check for mismatches
              if (fixedItem.href && parentHref && fixedItem.href.includes('#')) {
                // Extract base file names (without fragment/anchor)
                const itemFile = fixedItem.href.split('#')[0];
                const parentFile = parentHref.split('#')[0];
                
                // Extract just the filename for comparison
                const itemFileName = itemFile.split('/').pop() || '';
                const parentFileName = parentFile.split('/').pop() || '';
                
                // Check if it's a clear mismatch (e.g., act-1 scenes pointing to act-5.xhtml)
                if (itemFileName.match(/act-\d+|chapter-\d+|ch-\d+/i) && 
                    parentFileName.match(/act-\d+|chapter-\d+|ch-\d+/i)) {
                  
                  // Extract numbers for comparison
                  const itemMatch = itemFileName.match(/(act|chapter|ch)-(\d+)/i);
                  const parentMatch = parentFileName.match(/(act|chapter|ch)-(\d+)/i);
                  
                  if (itemMatch && parentMatch && itemMatch[2] !== parentMatch[2]) {
                    // Mismatch detected! Fix it by using parent's file with child's fragment
                    const fragment = fixedItem.href.split('#')[1];
                    fixedItem.href = `${parentFile}#${fragment}`;
                    console.warn(
                      `🔧 Fixed navigation mismatch: "${item.label}" was pointing to ` +
                      `"${item.href}" but corrected to "${fixedItem.href}" (parent: "${parentHref}")`
                    );
                  }
                }
              }
              
              // Recursively fix subitems, using this item's href as the parent
              if (fixedItem.subitems && fixedItem.subitems.length > 0) {
                fixedItem.subitems = fixNavigationMismatches(
                  fixedItem.subitems, 
                  fixedItem.href || parentHref
                );
              }
              
              return fixedItem;
            });
          };

          // Fix navigation mismatches before storing
          let fixedTOC = nav.toc || [];
          if (fixedTOC.length > 0) {
            fixedTOC = fixNavigationMismatches(fixedTOC);
          }

          setChapters(chapters);
          // Store the fixed full TOC for navigation
          setFullTOC(fixedTOC);

          // Helper function to recursively format navigation items
          const formatNavItems = (items: NavItem[], depth: number = 0): Record<string, string> => {
            const result: Record<string, string> = {};
            items.forEach((item) => {
              const indent = "  ".repeat(depth);
              const key = `${indent}${item.label}`;
              result[key] = item.href || "no href";
              if (item.subitems && item.subitems.length > 0) {
                Object.assign(result, formatNavItems(item.subitems, depth + 1));
              }
            });
            return result;
          };

          // Helper function to format landmarks
          const formatLandmarks = (landmarks: any[]): Record<string, string> => {
            const result: Record<string, string> = {};
            landmarks.forEach((landmark) => {
              const key = `[${landmark.type || "unknown"}] ${landmark.label || "Untitled"}`;
              result[key] = landmark.href || "no href";
            });
            return result;
          };

          // Helper function to format pageList
          const formatPageList = (pageList: any[]): Record<string, string> => {
            const result: Record<string, string> = {};
            pageList.forEach((page) => {
              const key = page.label || `Page ${page.pagenum || "unknown"}`;
              result[key] = page.href || "no href";
            });
            return result;
          };

          // Helper function to format links
          const formatLinks = (links: any[]): Record<string, string> => {
            const result: Record<string, string> = {};
            links.forEach((link) => {
              const key = link.title || link.href || "Unnamed link";
              result[key] = link.href || "no href";
            });
            return result;
          };

          // Cast nav to any to access potentially missing properties
          const navAny = nav as any;

          // Comprehensive EPUB Navigation Information
          const epubNavigationInfo: Record<string, any> = {
            "📖 Table of Contents (TOC)": nav.toc
              ? formatNavItems(nav.toc)
              : "No TOC available",
            "🏷️ Landmarks": nav.landmarks
              ? formatLandmarks(nav.landmarks)
              : "No landmarks available",
            "📄 Page List": navAny.pageList
              ? formatPageList(navAny.pageList)
              : "No page list available",
            "🔗 Links": navAny.links
              ? formatLinks(navAny.links)
              : "No links available",
          };

          // Additional metadata
          const navigationMetadata = {
            "TOC Items Count": nav.toc?.length || 0,
            "Landmarks Count": nav.landmarks?.length || 0,
            "Page List Count": navAny.pageList?.length || 0,
            "Links Count": navAny.links?.length || 0,
            "Detected Chapters": chapters.length,
            "Chapter Types (from landmarks)": nav.landmarks?.map((l: any) => l.type) || [],
          };

          console.group("📚 EPUB Navigation Structure");
          console.log("Navigation Metadata:", navigationMetadata);
          console.log("\nFull Navigation Data:", epubNavigationInfo);
          
          // Also log in the requested format: "label: href"
          console.log("\n📋 Navigation in Format: (label: href)");
          
          if (nav.toc && nav.toc.length > 0) {
            console.group("Table of Contents (TOC)");
            const logTOC = (items: NavItem[], depth: number = 0) => {
              items.forEach((item) => {
                const indent = "  ".repeat(depth);
                console.log(`${indent}"${item.label}": "${item.href || "no href"}"`);
                if (item.subitems && item.subitems.length > 0) {
                  logTOC(item.subitems, depth + 1);
                }
              });
            };
            logTOC(nav.toc);
            console.groupEnd();
          }

          if (nav.landmarks && nav.landmarks.length > 0) {
            console.group("Landmarks");
            nav.landmarks.forEach((landmark: any) => {
              const landmarkType = landmark.type || "unknown";
              const landmarkLabel = landmark.label || "Untitled";
              console.log(`"[${landmarkType}] ${landmarkLabel}": "${landmark.href || "no href"}"`);
            });
            console.groupEnd();
          }

          if (navAny.pageList && navAny.pageList.length > 0) {
            console.group("Page List");
            navAny.pageList.forEach((page: any) => {
              const pageLabel = page.label || `Page ${page.pagenum || "unknown"}`;
              console.log(`"${pageLabel}": "${page.href || "no href"}"`);
            });
            console.groupEnd();
          }

          if (navAny.links && navAny.links.length > 0) {
            console.group("Links");
            navAny.links.forEach((link: any) => {
              const linkTitle = link.title || link.href || "Unnamed";
              console.log(`"${linkTitle}": "${link.href || "no href"}"`);
            });
            console.groupEnd();
          }

          console.groupEnd();

          // Generate locations for proper pagination/navigation
          // This is necessary for prev/next buttons to work correctly
          // Especially important when starting from title page or frontmatter
          if (newBook.locations) {
            try {
              // Generate locations - this creates the pagination system
              // Without this, navigation can fail or show empty pages
              await newBook.locations.generate(200);
            } catch (error) {
              console.warn("Could not generate locations immediately:", error);
              // Locations will be generated on-demand, but navigation may be delayed
            }
          }

          // Determine where to start the book - skip to bodymatter (first chapter)
          let initialLocation: string | undefined = undefined;
          
          // Strategy 1: Try to find first bodymatter/chapter using landmarks (most semantic)
          if (nav.landmarks && nav.landmarks.length > 0) {
            // Look for bodymatter or chapter landmarks (exclude frontmatter/backmatter)
            const bodymatterTypes = ["bodymatter", "chapter", "text", "section", "scene", "part"];
            const frontmatterTypes = ["titlepage", "frontmatter", "toc", "imprint", "copyright", "dedication", "preface", "foreword"];
            
            const firstBodymatter = nav.landmarks.find((landmark: any) => {
              if (!landmark.type) return false;
              const type = landmark.type.toLowerCase();
              // Must be bodymatter type and not frontmatter
              return bodymatterTypes.some(bt => type.includes(bt)) &&
                     !frontmatterTypes.some(ft => type.includes(ft));
            });
            
            if (firstBodymatter && firstBodymatter.href) {
              initialLocation = firstBodymatter.href;
            }
          }
          
          // Strategy 2: Use first chapter from filtered chapters list
          if (!initialLocation && chapters.length > 0 && chapters[0].href) {
            initialLocation = chapters[0].href;
          }
          
          // Strategy 3: Find first non-frontmatter item in spine
          if (!initialLocation) {
            try {
              const spine = await newBook.loaded.spine;
              if (spine) {
                const spineItems = (spine as any).items || [];
                // Skip frontmatter items by checking against known frontmatter patterns
                const frontmatterPatterns = ["titlepage", "imprint", "copyright", "dedication", "preface", "foreword", "toc"];
                
                for (const item of spineItems) {
                  if (item.href) {
                    const hrefLower = item.href.toLowerCase();
                    const isFrontmatter = frontmatterPatterns.some(pattern => 
                      hrefLower.includes(pattern)
                    );
                    if (!isFrontmatter) {
                      initialLocation = item.href;
                      break;
                    }
                  }
                }
              }
            } catch (spineError) {
              console.warn("Could not access spine for initial location:", spineError);
            }
          }

          // Display the book at the determined location
          if (initialLocation) {
            await newRendition.display(initialLocation);
          } else {
            // Final fallback: start from beginning (title page)
            await newRendition.display();
          }

          // Ensure locations are available after display
          // This fixes the issue where prev/next buttons don't work at title page
          newRendition.on("displayed", async () => {
            // Regenerate locations if they weren't ready initially
            // This ensures navigation works even from the title page
            if (newBook.locations && !newBook.locations.length) {
              try {
                await newBook.locations.generate(200);
              } catch (error) {
                console.warn("Could not generate locations after display:", error);
              }
            }
          });

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
                const href = location.start.href || null;
                setCurrentChapter(href);
                // Find the chapter label from all navigation sources
                // Use the navigation from closure (nav variable is in scope)
                let label: string | null = null;
                if (href && nav) {
                  // Try full TOC first (most comprehensive)
                  if (nav.toc) {
                    label = findChapterLabel(href, nav.toc);
                  }
                  // Fallback to landmarks if not found in TOC
                  if (!label && nav.landmarks) {
                    const landmark = nav.landmarks.find(
                      (l: any) => l.href === href
                    );
                    if (landmark && landmark.label) {
                      label = landmark.label;
                    }
                  }
                  setCurrentChapterLabel(label);
                }
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

    // Get CFI directly from rendition (recommended by epub.js documentation)
    // This ensures we get the most up-to-date location at the moment of bookmark creation
    let cfi: string | null = null;
    let percentage: number | undefined = undefined;
    let chapterTitle: string | null = currentChapterLabel || currentChapter;

    if (rendition) {
      try {
        // Use rendition.currentLocation() as recommended by epub.js for bookmark creation
        // currentLocation() returns a DisplayedLocation object
        const location = rendition.currentLocation();
        if (location) {
          // DisplayedLocation has a start property with CFI
          const start = (location as any).start;
          if (start && start.cfi) {
            cfi = start.cfi;
            // Convert percentage from 0-1 to 0-100, round to 2 decimals
            const rawPercentage = start.percentage;
            percentage =
              rawPercentage !== undefined && rawPercentage !== null
                ? Math.round(rawPercentage * 10000) / 100
                : undefined;
          }
        }
      } catch (error) {
        console.error("Error getting current location from rendition:", error);
      }
    }

    // Fallback to state if rendition.currentLocation() fails
    if (!cfi && currentLocation && typeof currentLocation === "string") {
      cfi = currentLocation;
      percentage =
        currentPercentage > 0
          ? Math.round(currentPercentage * 100) / 100
          : undefined;
    }

    // Validate CFI before creating bookmark
    if (!cfi || typeof cfi !== "string") {
      alert(
        "Unable to determine reading position. Please wait a moment for the page to fully load, then try again."
      );
      return;
    }

    createBookmarkMutation.mutate({
      bookmarkName: bookmarkName.trim(),
      chapterTitle: chapterTitle,
      cfi: cfi, // Use CFI directly - the recommended way by epub.js
      positionPercentage: percentage,
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


  // Recursive component to render nested chapters
  const renderChapter = (
    chapter: NavItem,
    depth: number = 0
  ) => {
    const hasSubitems = chapter.subitems && chapter.subitems.length > 0;
    const expansionKey = chapter.href || `${chapter.label}-${depth}`;
    const isExpanded = expandedChapters.has(expansionKey);
    const isCurrentChapter = currentChapter === chapter.href;
    const chapterKey = chapter.href || `${chapter.label}-${depth}`;

    const toggleExpansion = (e: React.MouseEvent) => {
      e.stopPropagation();
      setExpandedChapters((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(expansionKey)) {
          newSet.delete(expansionKey);
        } else {
          newSet.add(expansionKey);
        }
        return newSet;
      });
    };

    return (
      <div key={chapterKey} className="w-full">
        <div className="flex items-center w-full">
          {hasSubitems && (
            <button
              onClick={toggleExpansion}
              className="p-1 hover:bg-accent rounded-sm"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </button>
          )}
          {!hasSubitems && <div className="w-6" />}
          <button
            onClick={() => handleNavigateToChapter(chapter.href)}
            className={`flex-1 text-left px-4 py-3 rounded-md transition-colors border border-border ${
              isCurrentChapter
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
            style={{ paddingLeft: `${depth * 1.5 + 1}rem` }}
          >
            <div className="font-medium">{chapter.label}</div>
          </button>
        </div>
        {hasSubitems && isExpanded && (
          <div>
            {chapter.subitems!.map((subChapter, subIndex) =>
              renderChapter(subChapter, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  // Helper to get all hrefs in reading order from TOC
  const getAllHrefs = (items: NavItem[]): string[] => {
    const hrefs: string[] = [];
    const traverse = (navItems: NavItem[]) => {
      navItems.forEach((item) => {
        if (item.href) {
          hrefs.push(item.href);
        }
        if (item.subitems && item.subitems.length > 0) {
          traverse(item.subitems);
        }
      });
    };
    traverse(items);
    return hrefs;
  };

  // Helper to normalize href for comparison (remove fragments, normalize path)
  const normalizeHref = (href: string | null | undefined): string | null => {
    if (!href) return null;
    // Remove fragment/anchor for comparison
    return href.split('#')[0];
  };

  // Helper to find current index in href array, handling fragments
  const findCurrentIndex = (allHrefs: string[], currentHref: string | null): number => {
    if (!currentHref) return -1;
    
    const normalizedCurrent = normalizeHref(currentHref);
    if (!normalizedCurrent) return -1;
    
    // First try exact match
    let index = allHrefs.indexOf(currentHref);
    if (index >= 0) return index;
    
    // Then try normalized match (without fragment)
    index = allHrefs.findIndex(href => normalizeHref(href) === normalizedCurrent);
    if (index >= 0) return index;
    
    // Finally try matching by filename (for cases where path differs slightly)
    const currentFilename = normalizedCurrent.split('/').pop();
    if (currentFilename) {
      index = allHrefs.findIndex(href => {
        const normalized = normalizeHref(href);
        return normalized && normalized.split('/').pop() === currentFilename;
      });
      if (index >= 0) return index;
    }
    
    return -1;
  };

  const handleNextPage = async () => {
    if (!rendition || !book) return;

    try {
      // First, try using Spine order (authoritative reading order from OPF)
      const spine = await book.loaded.spine;
      if (spine) {
        const spineItems = (spine as any).items || [];
        if (spineItems.length > 0) {
          const currentHref = currentChapter;
          const normalizedCurrent = normalizeHref(currentHref);
          
          // Find current position in spine
          let currentIndex = -1;
          if (normalizedCurrent) {
            currentIndex = spineItems.findIndex((item: any) => {
              const itemHref = item.href;
              const normalizedItem = normalizeHref(itemHref);
              return normalizedItem === normalizedCurrent || 
                     itemHref === currentHref ||
                     (itemHref && itemHref.includes(normalizedCurrent.split('/').pop() || ''));
            });
          }
          
          // If found in spine, navigate to next spine item
          if (currentIndex >= 0 && currentIndex < spineItems.length - 1) {
            const nextItem = spineItems[currentIndex + 1];
            if (nextItem && nextItem.href) {
              try {
                await rendition.display(nextItem.href);
                return;
              } catch (displayError) {
                console.error("Error displaying next spine item:", displayError);
                // Fall through to TOC navigation
              }
            }
          }
        }
      }
    } catch (spineError) {
      console.error("Error accessing spine:", spineError);
      // Fall through to TOC navigation
    }

    // Fallback: Use TOC order if spine navigation fails
    const navigationSource = fullTOC.length > 0 ? fullTOC : chapters;
    if (navigationSource && navigationSource.length > 0) {
      const allHrefs = getAllHrefs(navigationSource);
      if (allHrefs.length > 0) {
        const currentHref = currentChapter;
        const currentIndex = findCurrentIndex(allHrefs, currentHref);

        if (currentIndex >= 0 && currentIndex < allHrefs.length - 1) {
          const nextHref = allHrefs[currentIndex + 1];
          if (nextHref) {
            try {
              await rendition.display(nextHref);
              return;
            } catch (displayError) {
              console.error("Error displaying next TOC item:", displayError);
            }
          }
        }
      }
    }

    // Final fallback: use epub.js default navigation
    try {
      await rendition.next();
    } catch (error) {
      console.error("Error navigating to next page:", error);
    }
  };

  const handlePrevPage = async () => {
    if (!rendition || !book) return;

    try {
      // First, try using Spine order (authoritative reading order from OPF)
      const spine = await book.loaded.spine;
      if (spine) {
        const spineItems = (spine as any).items || [];
        if (spineItems.length > 0) {
          const currentHref = currentChapter;
          const normalizedCurrent = normalizeHref(currentHref);
          
          // Find current position in spine
          let currentIndex = -1;
          if (normalizedCurrent) {
            currentIndex = spineItems.findIndex((item: any) => {
              const itemHref = item.href;
              const normalizedItem = normalizeHref(itemHref);
              return normalizedItem === normalizedCurrent || 
                     itemHref === currentHref ||
                     (itemHref && itemHref.includes(normalizedCurrent.split('/').pop() || ''));
            });
          }
          
          // If found in spine, navigate to previous spine item
          if (currentIndex > 0) {
            const prevItem = spineItems[currentIndex - 1];
            if (prevItem && prevItem.href) {
              try {
                await rendition.display(prevItem.href);
                return;
              } catch (displayError) {
                console.error("Error displaying previous spine item:", displayError);
                // Fall through to TOC navigation
              }
            }
          }
        }
      }
    } catch (spineError) {
      console.error("Error accessing spine:", spineError);
      // Fall through to TOC navigation
    }

    // Fallback: Use TOC order if spine navigation fails
    const navigationSource = fullTOC.length > 0 ? fullTOC : chapters;
    if (navigationSource && navigationSource.length > 0) {
      const allHrefs = getAllHrefs(navigationSource);
      if (allHrefs.length > 0) {
        const currentHref = currentChapter;
        const currentIndex = findCurrentIndex(allHrefs, currentHref);

        if (currentIndex > 0) {
          const prevHref = allHrefs[currentIndex - 1];
          if (prevHref) {
            try {
              await rendition.display(prevHref);
              return;
            } catch (displayError) {
              console.error("Error displaying previous TOC item:", displayError);
            }
          }
        }
      }
    }

    // Final fallback: use epub.js default navigation
    try {
      await rendition.prev();
    } catch (error) {
      console.error("Error navigating to previous page:", error);
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
    <div className="flex flex-col h-screen bg-background" id="ebook-reader-main">
      {/* Header */}
      <div className="border-b border-border bg-background">
        <div className="px-2 sm:px-4 py-2 sm:py-3 lg:px-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <div className="min-w-0 flex-1">
                {/* Breadcrumb - hidden on mobile */}
                <Breadcrumb className="hidden sm:block">
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
                <h1 className="text-sm sm:text-lg font-semibold mt-0 sm:mt-1 truncate">
                  {ebook.title}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {ebook.author}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Dialog
                open={bookmarkDialogOpen}
                onOpenChange={setBookmarkDialogOpen}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 w-8 sm:h-9 sm:w-9 p-0">
                        <BookmarkPlus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add Bookmark</p>
                  </TooltipContent>
                </Tooltip>
                <DialogContent
                  className="sm:max-w-md w-[calc(100%-2rem)] mx-auto"
                  onOpenAutoFocus={(e) => {
                    // Prevent auto-focus on open to avoid focus issues
                    e.preventDefault();
                    // Focus the input field instead
                    const input = document.getElementById("bookmark-name");
                    if (input) {
                      setTimeout(() => input.focus(), 0);
                    }
                  }}
                >
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
                    {currentChapterLabel && (
                      <div className="text-sm text-muted-foreground">
                        Current Chapter: {currentChapterLabel}
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DrawerTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 w-8 sm:h-9 sm:w-9 p-0">
                        <Menu className="h-4 w-4" />
                      </Button>
                    </DrawerTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Chapters</p>
                  </TooltipContent>
                </Tooltip>
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
                            <div key={chapter.href || index}>
                              {renderChapter(chapter, 0)}
                            </div>
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DrawerTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 w-8 sm:h-9 sm:w-9 p-0">
                        <Bookmark className="h-4 w-4" />
                      </Button>
                    </DrawerTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Bookmarks</p>
                  </TooltipContent>
                </Tooltip>
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
                            <div
                              key={bookmark.bookmark_id}
                              className="group relative border border-border rounded-md hover:bg-accent transition-colors"
                            >
                              <button
                                onClick={() => {
                                  handleNavigateToBookmark(bookmark);
                                  setBookmarkDrawerOpen(false);
                                }}
                                className="w-full text-left px-4 py-3 pr-10"
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
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (
                                    confirm(
                                      `Are you sure you want to delete "${bookmark.bookmark_name}"?`
                                    )
                                  ) {
                                    deleteBookmarkMutation.mutate(
                                      bookmark.bookmark_id
                                    );
                                  }
                                }}
                                className="absolute top-3 right-3 p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground rounded-sm transition-opacity"
                                aria-label="Delete bookmark"
                                disabled={deleteBookmarkMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
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
        <div className="flex-1 relative flex justify-center h-full w-full overflow-hidden">
          <div className="w-full max-w-full sm:max-w-[800px] h-full relative overflow-hidden">
            <div
              ref={viewerRef}
              className="w-full h-full overflow-hidden"
              style={{
                backgroundColor: theme === "dark" ? "#1a1a1a" : "#ffffff",
              }}
            />

            {/* Left click area for previous page - larger on mobile for easier tapping */}
            <div
              className="absolute left-0 top-0 w-2/5 sm:w-1/3 h-full cursor-pointer active:bg-black/10 dark:active:bg-white/10 sm:hover:bg-black/5 sm:dark:hover:bg-white/5 transition-colors touch-none"
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

            {/* Right click area for next page - larger on mobile for easier tapping */}
            <div
              className="absolute right-0 top-0 w-2/5 sm:w-1/3 h-full cursor-pointer active:bg-black/10 dark:active:bg-white/10 sm:hover:bg-black/5 sm:dark:hover:bg-white/5 transition-colors touch-none"
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
          </div>
        </div>
      </div>
    </div>
  );
}
