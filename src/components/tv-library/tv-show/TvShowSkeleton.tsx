import { Skeleton } from "@/components/ui/skeleton";

export function TvShowSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-10 w-32 mb-4" />
      <div className="flex flex-col md:flex-row gap-6">
        <Skeleton className="w-full md:w-64 h-96" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}

