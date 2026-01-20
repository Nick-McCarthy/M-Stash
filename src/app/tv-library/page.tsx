"use client";
import { useState } from "react";
import { GeneralPagination } from "@/components/GeneralPagination";
import TvShowCard from "@/components/tv-library/TvShowCard";
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
import { useTvShowsWithFilters } from "@/lib/queries/tv-shows";

export default function TvLibrary() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Use React Query to fetch TV shows with pagination
  const {
    data: tvShowsData,
    isLoading,
    error,
  } = useTvShowsWithFilters(currentPage, itemsPerPage);

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
