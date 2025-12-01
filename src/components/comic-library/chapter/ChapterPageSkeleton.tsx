import { Skeleton } from "@/components/ui/skeleton";

export function ChapterPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb Skeleton */}
        <div className="mb-6 flex justify-center">
          <Skeleton className="h-5 w-96" />
        </div>

        {/* Navigation Controls Skeleton */}
        <div className="flex justify-center mb-8">
          <Skeleton className="h-10 w-80" />
        </div>

        {/* Title Skeleton */}
        <div className="text-center mb-8">
          <Skeleton className="h-8 w-64 mb-2 mx-auto" />
          <Skeleton className="h-6 w-32 mx-auto" />
        </div>

        {/* Chapter Images Skeleton */}
        <div className="max-w-4xl mx-auto">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="relative">
              <div className="relative w-full border-l-2 border-r-2 border-gray-300">
                <Skeleton className="w-full h-[1200px]" />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Navigation Skeleton */}
        <div className="pb-8 mt-8">
          <div className="flex justify-center">
            <Skeleton className="h-10 w-80" />
          </div>
        </div>
      </div>
    </div>
  );
}
