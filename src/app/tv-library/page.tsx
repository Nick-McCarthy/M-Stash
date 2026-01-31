"use client";
import { useState } from "react";
import { GeneralPagination } from "@/components/GeneralPagination";
import TvShowCard from "@/components/tv-library/TvShowCard";
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
import { useTvShowsWithFilters } from "@/lib/queries/tv-shows";
import { TvShowFilterDrawer, type TvShowFilterOptions } from "@/components/tv-library/TvShowFilter";
import { useTags } from "@/lib/queries/tags";
import { useGenres } from "@/lib/queries/genres";

export default function TvLibrary() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const [filterOptions, setFilterOptions] = useState<TvShowFilterOptions>({
    sortBy: "az-asc",
    tags: [],
    genres: [],
  });

  // Build filters object for the query
  const filters = {
    tag: filterOptions.tags[0],
    genre: filterOptions.genres[0],
    sort: filterOptions.sortBy,
  };

  // Use React Query to fetch TV shows with filters and pagination
  const {
    data: tvShowsData,
    isLoading,
    error,
  } = useTvShowsWithFilters(currentPage, itemsPerPage, filters);

  // Fetch all available tags and genres
  const { data: availableTags = [], isLoading: isLoadingTags } = useTags();
  const { data: availableGenres = [], isLoading: isLoadingGenres } = useGenres();

  const handleFiltersChange = (newFilters: TvShowFilterOptions) => {
    setFilterOptions(newFilters);
    // Reset to first page when filters change
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilterOptions({
      sortBy: "az-asc",
      tags: [],
      genres: [],
    });
    setCurrentPage(1);
  };

  const hasActiveFilters =
    filterOptions.sortBy !== "az-asc" ||
    filterOptions.tags.length > 0 ||
    filterOptions.genres.length > 0;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const TvShowSkeleton = () => (
    <Card className="overflow-hidden">
      <div className="aspect-[2/3] relative">
        <Skeleton className="w-full h-full" />
      </div>
      <Card className="p-4">
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
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
              <BreadcrumbPage>TV Library</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <TooltipProvider>
          <div className="flex items-center gap-2">
            <TvShowFilterDrawer
              filters={filterOptions}
              onFiltersChange={handleFiltersChange}
              availableTags={availableTags}
              availableGenres={availableGenres}
              isLoadingTags={isLoadingTags}
              isLoadingGenres={isLoadingGenres}
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
              <p className="text-sm text-red-500">Error loading TV shows</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Showing {tvShowsData?.tv_shows.length || 0} of{" "}
                {tvShowsData?.pagination.totalItems || 0} TV shows
              </p>
            )}
          </div>
        </div>

        {/* TV Shows Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          {isLoading ? (
            Array.from({ length: itemsPerPage }).map((_, i) => (
              <TvShowSkeleton key={i} />
            ))
          ) : error ? (
            <div className="col-span-full text-center py-12">
              <p className="text-red-500">Failed to load TV shows</p>
              <p className="text-sm text-muted-foreground">
                Please try again later.
              </p>
            </div>
          ) : tvShowsData?.tv_shows && tvShowsData.tv_shows.length > 0 ? (
            tvShowsData.tv_shows.map((show) => (
              <TvShowCard
                key={show.tv_show_id}
                id={show.tv_show_id.toString()}
                title={show.title}
                thumbnail={show.thumbnail_address}
                views={show.views}
                updatedAt={show.updated_at.toString()}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No TV shows found.</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search criteria.
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
          totalPages={Math.max(tvShowsData?.pagination.totalPages || 1, 1)}
        />
      </div>
    </div>
  );
}
