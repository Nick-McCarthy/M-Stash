"use client";
import { useState } from "react";
import { GeneralPagination } from "@/components/GeneralPagination";
import MovieCard from "@/components/movie-library/MovieCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useMoviesWithFilters } from "@/lib/queries/movies";

export default function MovieLibrary() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Use React Query to fetch movies with pagination
  const {
    data: moviesData,
    isLoading,
    error,
  } = useMoviesWithFilters(currentPage, itemsPerPage);

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
