import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ComicPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb Skeleton */}
      <div className="mb-6 flex justify-center">
        <Skeleton className="h-5 w-64" />
      </div>

      {/* Main Content Layout Skeleton */}
      <div className="flex flex-col lg:flex-row gap-4 justify-center items-stretch lg:h-[calc(100vh-160px)]">
        {/* Comic Details Card Skeleton */}
        <Card className="w-fit mx-auto lg:mx-0 lg:w-80 lg:flex lg:flex-col">
          <CardContent className="p-6 lg:flex-1 lg:flex lg:flex-col">
            <div className="space-y-6 lg:flex-1 lg:flex lg:flex-col">
              {/* Thumbnail Skeleton */}
              <div className="flex justify-center flex-shrink-0">
                <Skeleton className="w-64 h-96 rounded-lg" />
              </div>

              {/* Comic Details Skeleton */}
              <div className="space-y-4 lg:flex-1">
                <div>
                  <Skeleton className="h-8 w-48 mb-2 mx-auto" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-center gap-2 sm:gap-4">
                    <Skeleton className="h-4 w-16 mx-auto sm:mx-0" />
                    <Skeleton className="h-4 w-16 mx-auto sm:mx-0" />
                    <Skeleton className="h-4 w-20 mx-auto sm:mx-0" />
                  </div>
                </div>

                {/* Type and Status Skeleton */}
                <div className="flex gap-2 justify-center">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>

                {/* Description Skeleton */}
                <div>
                  <Skeleton className="h-5 w-24 mb-2" />
                  <Skeleton className="h-16 w-full" />
                </div>

                {/* Genres Skeleton */}
                <div>
                  <Skeleton className="h-5 w-16 mb-2" />
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-18" />
                  </div>
                </div>

                {/* Tags Skeleton */}
                <div>
                  <Skeleton className="h-5 w-12 mb-2" />
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chapters List Card Skeleton */}
        <Card className="w-full lg:w-80 flex-shrink-0 lg:flex lg:flex-col">
          <CardHeader className="flex-shrink-0">
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto space-y-1">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
