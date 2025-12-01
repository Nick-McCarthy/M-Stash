"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Flame } from "lucide-react";
import { useRouter } from "next/navigation";

interface Chapter {
  chapter_id: number;
  chapter_number: number;
  favorite: boolean;
}

interface ChaptersListCardProps {
  comicId: number;
  chapters: Chapter[];
}

export function ChaptersListCard({ comicId, chapters }: ChaptersListCardProps) {
  const router = useRouter();

  return (
    <Card className="w-full lg:w-80 flex-shrink-0 lg:flex lg:flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle>Chapters ({chapters.length})</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 min-h-0">
        {chapters.length > 0 ? (
          <div className="flex-1 overflow-y-auto space-y-1">
            {chapters.map((chapter) => (
              <div
                key={chapter.chapter_id}
                className="flex items-center justify-between p-2 border rounded hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => {
                  router.push(
                    `/comic-library/${comicId}/${chapter.chapter_number}`
                  );
                }}
              >
                <div className="flex items-center gap-2">
                  {chapter.favorite ? (
                    <div className="w-6 h-6 flex items-center justify-center">
                      <Flame
                        className="h-4 w-4 fill-orange-500 text-orange-500 stroke-orange-500"
                        strokeWidth={2}
                      />
                    </div>
                  ) : (
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium">
                      {chapter.chapter_number}
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                  Read
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No chapters available yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
