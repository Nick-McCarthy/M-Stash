"use client";
import { useState } from "react";
import { GeneralPagination } from "@/components/GeneralPagination";
import MovieCard from "@/components/movie-library/MovieCard";
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
import { useMoviesWithFilters } from "@/lib/queries/movies";
import { MovieFilterDrawer, type MovieFilterOptions } from "@/components/movie-library/MovieFilter";
import { useTags } from "@/lib/queries/tags";
import { useGenres } from "@/lib/queries/genres";
import type { MovieSortOption } from "@/lib/schemas/movies";

export default function MovieLibrary() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const [filterOptions, setFilterOptions] = useState<MovieFilterOptions>({
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

  // Use React Query to fetch movies with filters and pagination
  const {
    data: moviesData,
    isLoading,
    error,
  } = useMoviesWithFilters(currentPage, itemsPerPage, filters);

  // Fetch all available tags and genres
  const { data: availableTags = [], isLoading: isLoadingTags } = useTags();
  const { data: availableGenres = [], isLoading: isLoadingGenres } = useGenres();

  const handleFiltersChange = (newFilters: MovieFilterOptions) => {
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

  const MovieSkeleton = () => (
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
              <BreadcrumbPage>Movie Library</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <TooltipProvider>
          <div className="flex items-center gap-2">
            <MovieFilterDrawer
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
              <p className="text-sm text-red-500">Error loading movies</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Showing {moviesData?.movies.length || 0} of{" "}
                {moviesData?.pagination.totalItems || 0} movies
              </p>
            )}
          </div>
        </div>

        {/* Movie Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          {isLoading ? (
            Array.from({ length: itemsPerPage }).map((_, i) => (
              <MovieSkeleton key={i} />
            ))
          ) : error ? (
            <div className="col-span-full text-center py-12">
              <p className="text-red-500">Failed to load movies</p>
              <p className="text-sm text-muted-foreground">
                Please try again later.
              </p>
            </div>
          ) : moviesData?.movies && moviesData.movies.length > 0 ? (
            moviesData.movies.map((movie) => (
              <MovieCard
                key={movie.movie_id}
                id={movie.movie_id.toString()}
                title={movie.title}
                thumbnail={movie.thumbnail_address}
                views={movie.views}
                updatedAt={movie.updated_at}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No movies found.</p>
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
          totalPages={Math.max(moviesData?.pagination.totalPages || 1, 1)}
        />
      </div>
    </div>
  );
}
