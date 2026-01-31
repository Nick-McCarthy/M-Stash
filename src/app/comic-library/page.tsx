"use client";
import { useState } from "react";
import {
  FilterDrawer,
  type FilterOptions,
} from "@/components/comic-library/MultiFilter";
import { GeneralPagination } from "@/components/GeneralPagination";
import ComicCard from "@/components/comic-library/ComicCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { FilterX } from "lucide-react";
import { useComicsWithFilters } from "@/lib/queries/comics";
import { useTags } from "@/lib/queries/tags";

export default function ComicLibrary() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    type: "all",
    status: "all",
    sortBy: "az-asc",
    tags: [],
  });

  // Build filters object for the query
  const filters = {
    tag: filterOptions.tags[0],
    type: filterOptions.type !== "all" ? filterOptions.type : undefined,
    status: filterOptions.status !== "all" ? filterOptions.status : undefined,
    sort: filterOptions.sortBy,
  };

  // Use React Query to fetch comics with filters and pagination
  const {
    data: comicsData,
    isLoading,
    error,
  } = useComicsWithFilters(currentPage, itemsPerPage, filters);

  // Fetch all available tags from the tags API
  const { data: availableTags = [], isLoading: isLoadingTags } = useTags();

  const handleFiltersChange = (newFilters: FilterOptions) => {
    setFilterOptions(newFilters);
    // Reset to first page when filters change
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilterOptions({
      type: "all",
      status: "all",
      sortBy: "az-asc",
      tags: [],
    });
    setCurrentPage(1);
  };

  const hasActiveFilters =
    filterOptions.type !== "all" ||
    filterOptions.status !== "all" ||
    filterOptions.sortBy !== "az-asc" ||
    filterOptions.tags.length > 0;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const ComicSkeleton = () => (
    <Card className="overflow-hidden">
      <div className="aspect-[3/4] relative">
        <Skeleton className="w-full h-full" />
      </div>
      <Card className="p-4">
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2 mb-1" />
        <Skeleton className="h-4 w-1/3" />
      </Card>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex justify-center">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Comic Library</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <TooltipProvider>
          <div className="flex items-center gap-2">
            <FilterDrawer
              filters={filterOptions}
              onFiltersChange={handleFiltersChange}
              availableTags={availableTags}
              isLoadingTags={isLoadingTags}
            />
            {hasActiveFilters && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleClearFilters}
                  >
                    <FilterX className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Clear All Filters</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      </div>

      {/* Results */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            {isLoading ? (
              <Skeleton className="h-6 w-32" />
            ) : error ? (
              <p className="text-sm text-red-500">Error loading comics</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Showing {comicsData?.comics.length || 0} of{" "}
                {comicsData?.pagination.totalItems || 0} comics
              </p>
            )}
          </div>
        </div>

        {/* Comic Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          {isLoading ? (
            Array.from({ length: itemsPerPage }).map((_, i) => (
              <ComicSkeleton key={i} />
            ))
          ) : error ? (
            <div className="col-span-full text-center py-12">
              <p className="text-red-500">Failed to load comics</p>
              <p className="text-sm text-muted-foreground">
                Please try again later.
              </p>
            </div>
          ) : comicsData?.comics && comicsData.comics.length > 0 ? (
            comicsData.comics.map((comic) => (
              <ComicCard
                key={comic.comic_id}
                id={comic.comic_id.toString()}
                title={comic.comic_title}
                thumbnail={comic.thumbnail_address}
                views={comic.views}
                updatedAt={comic.updated_at}
                recentChapters={comic.recentChapters || []}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No comics found.</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your filters or search criteria.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-center">
        <GeneralPagination
          page={currentPage}
          setPage={handlePageChange}
          totalPages={Math.max(comicsData?.pagination.totalPages || 1, 1)}
        />
      </div>
    </div>
  );
}
