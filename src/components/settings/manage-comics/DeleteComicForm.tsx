"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, AlertTriangle } from "lucide-react";
import { useAllComics } from "@/hooks/useAllComics";
import { useDeleteComic } from "@/lib/queries/comics";

export function DeleteComicForm() {
  const {
    comics: comicsData,
    isLoading: comicsLoading,
    error: comicsError,
  } = useAllComics();

  const [selectedComic, setSelectedComic] = useState<string>("");
  const deleteComicMutation = useDeleteComic();

  const handleDeleteComic = async () => {
    if (!selectedComic) {
      return;
    }

    if (
      !confirm(
        "Are you sure you want to delete this comic? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await deleteComicMutation.mutateAsync(parseInt(selectedComic));
      alert("Comic deleted successfully!");
      setSelectedComic("");
    } catch (error) {
      console.error("Failed to delete comic:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete comic. Please try again."
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Delete Comic
        </CardTitle>
        <CardDescription>
          Permanently remove a comic and all its chapters from your library.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Select Comic to Delete</Label>
          {comicsLoading ? (
            <div className="text-sm text-muted-foreground">
              Loading comics...
            </div>
          ) : comicsError ? (
            <div className="text-sm text-destructive">
              Failed to load comics. Please try again.
            </div>
          ) : (
            <Select
              value={selectedComic}
              onValueChange={setSelectedComic}
              disabled={deleteComicMutation.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a comic to delete" />
              </SelectTrigger>
              <SelectContent>
                {comicsData?.map((comic) => (
                  <SelectItem
                    key={comic.comic_id}
                    value={comic.comic_id.toString()}
                  >
                    {comic.comic_title} ({comic.number_of_chapters} chapters)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {selectedComic && (
          <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
            <p className="text-sm text-destructive font-medium">
              Warning: This action cannot be undone. All chapters and images for
              this comic will be permanently deleted.
            </p>
          </div>
        )}

        <Button
          variant="destructive"
          onClick={handleDeleteComic}
          disabled={!selectedComic || deleteComicMutation.isPending}
          className="w-full"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {deleteComicMutation.isPending
            ? "Deleting..."
            : "Delete Comic Permanently"}
        </Button>
      </CardContent>
    </Card>
  );
}
