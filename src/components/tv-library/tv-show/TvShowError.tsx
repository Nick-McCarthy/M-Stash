"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TvShowErrorProps {
  error?: string | null;
}

export function TvShowError({ error }: TvShowErrorProps) {
  const router = useRouter();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Error Loading TV Show</h1>
        <p className="text-muted-foreground mb-4">
          {error || "TV show not found"}
        </p>
        <Button onClick={() => router.push("/tv-library")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Library
        </Button>
      </div>
    </div>
  );
}

