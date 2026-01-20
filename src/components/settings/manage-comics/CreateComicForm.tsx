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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, X } from "lucide-react";
import { useTags } from "@/lib/queries/tags";

const comicTypes = [
  { value: "manga", label: "Manga" },
  { value: "webtoon", label: "Webtoon" },
  { value: "western", label: "Western" },
];

const comicStatuses = [
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "hiatus", label: "Hiatus" },
  { value: "cancelled", label: "Cancelled" },
];

export function CreateComicForm() {
  const {
    data: availableTags = [],
    isLoading: tagsLoading,
    error: tagsError,
  } = useTags();

  const [newComic, setNewComic] = useState({
    title: "",
    thumbnail: "",
    thumbnailFile: null as File | null,
    description: "",
    type: "",
    status: "ongoing",
    tags: [] as string[],
  });

  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleTagToggle = (tag: string) => {
    setNewComic((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const handleThumbnailUpload = (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setNewComic((prev) => ({
      ...prev,
      thumbnail: previewUrl,
      thumbnailFile: file,
    }));
    setUploadError(null);
  };

  const handleCreateComic = async () => {
    try {
      setUploadError(null);

      if (!newComic.thumbnailFile) {
        throw new Error("Please select a thumbnail image");
      }

      const formData = new FormData();
      formData.append("thumbnail", newComic.thumbnailFile);
      formData.append("comic_title", newComic.title);
      formData.append("comic_description", newComic.description || "");
      formData.append("comic_type", newComic.type);
      formData.append("tags", JSON.stringify(newComic.tags));

      const response = await fetch("/api/settings/manage-comics/create-comic", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create comic");
      }

      const result = await response.json();

      // Reset form on success
      setNewComic({
        title: "",
        thumbnail: "",
        thumbnailFile: null,
        description: "",
        type: "",
        status: "ongoing",
        tags: [],
      });

      console.log("Comic created successfully:", result);
      alert("Comic created successfully!");
    } catch (error) {
      console.error("Failed to create comic:", error);
      setUploadError(
        error instanceof Error ? error.message : "Failed to create comic"
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Comic</CardTitle>
        <CardDescription>
          Add a new comic to your library with all the necessary details.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="comic-title">Comic Title *</Label>
            <Input
              id="comic-title"
              placeholder="Enter comic title"
              value={newComic.title}
              onChange={(e) =>
                setNewComic((prev) => ({
                  ...prev,
                  title: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="thumbnail">Thumbnail *</Label>
            <Input
              id="thumbnail"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleThumbnailUpload(file);
                }
              }}
              disabled={!newComic.type || !newComic.title}
            />
            {newComic.thumbnail && (
              <div className="mt-2">
                <img
                  src={newComic.thumbnail}
                  alt="Thumbnail preview"
                  className="w-32 h-32 object-cover rounded border"
                />
              </div>
            )}
          </div>
          {uploadError && (
            <p className="text-sm text-destructive">{uploadError}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Enter comic description"
            value={newComic.description}
            onChange={(e) =>
              setNewComic((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Comic Type *</Label>
            <Select
              value={newComic.type}
              onValueChange={(value) =>
                setNewComic((prev) => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select comic type" />
              </SelectTrigger>
              <SelectContent>
                {comicTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={newComic.status}
              onValueChange={(value) =>
                setNewComic((prev) => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {comicStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Tags</Label>
          {tagsLoading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : tagsError ? (
            <div className="text-sm text-destructive">
              Failed to load tags. Please try again.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <div key={tag} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tag-${tag}`}
                      checked={newComic.tags.includes(tag)}
                      onCheckedChange={() => handleTagToggle(tag)}
                    />
                    <Label htmlFor={`tag-${tag}`} className="text-sm">
                      {tag}
                    </Label>
                  </div>
                ))}
              </div>
              {newComic.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {newComic.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleTagToggle(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <Button
          onClick={handleCreateComic}
          disabled={
            !newComic.title ||
            !newComic.thumbnailFile ||
            !newComic.type ||
            !!uploadError
          }
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Comic
        </Button>
      </CardContent>
    </Card>
  );
}
