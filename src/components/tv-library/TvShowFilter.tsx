"use client";

import * as React from "react";
import { Filter, X } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { TvShowSortOption } from "@/lib/schemas/tv-shows";

export interface TvShowFilterOptions {
  sortBy: TvShowSortOption;
  tags: string[];
  genres: string[];
}

interface TvShowFilterDrawerProps {
  filters: TvShowFilterOptions;
  onFiltersChange: (filters: TvShowFilterOptions) => void;
  availableTags?: string[];
  availableGenres?: string[];
  isLoadingTags?: boolean;
  isLoadingGenres?: boolean;
}

export function TvShowFilterDrawer({
  filters,
  onFiltersChange,
  availableTags = [],
  availableGenres = [],
  isLoadingTags = false,
  isLoadingGenres = false,
}: TvShowFilterDrawerProps) {
  const [open, setOpen] = React.useState(false);

  const handleSortByChange = (value: string) => {
    onFiltersChange({
      ...filters,
      sortBy: value as TvShowFilterOptions["sortBy"],
    });
  };

  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];

    onFiltersChange({
      ...filters,
      tags: newTags,
    });
  };

  const handleGenreToggle = (genre: string) => {
    const newGenres = filters.genres.includes(genre)
      ? filters.genres.filter((g) => g !== genre)
      : [...filters.genres, genre];

    onFiltersChange({
      ...filters,
      genres: newGenres,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      sortBy: "az-asc",
      tags: [],
      genres: [],
    });
  };

  const hasActiveFilters =
    filters.sortBy !== "az-asc" || filters.tags.length > 0 || filters.genres.length > 0;

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="left">
      <Tooltip>
        <TooltipTrigger asChild>
          <DrawerTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="relative bg-transparent"
            >
              <Filter className="h-4 w-4" />
              {hasActiveFilters && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {filters.tags.length +
                    filters.genres.length +
                    (filters.sortBy !== "az-asc" ? 1 : 0)}
                </span>
              )}
            </Button>
          </DrawerTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Filters</p>
        </TooltipContent>
      </Tooltip>
      <DrawerContent>
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <DrawerTitle>Filters</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1 p-3">
          <div className="space-y-4">
            {/* Sort By Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Sort By</Label>
              <RadioGroup
                value={filters.sortBy}
                onValueChange={handleSortByChange}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="az-asc" id="sort-az-asc" />
                  <Label
                    htmlFor="sort-az-asc"
                    className="text-sm font-normal cursor-pointer"
                  >
                    A-Z
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="za-desc" id="sort-za-desc" />
                  <Label
                    htmlFor="sort-za-desc"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Z-A
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="date-updated" id="sort-date-updated" />
                  <Label
                    htmlFor="sort-date-updated"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Recently Updated
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="views" id="sort-views" />
                  <Label
                    htmlFor="sort-views"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Most Views
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Tags Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Tags</Label>
              {isLoadingTags ? (
                <div className="text-xs text-muted-foreground">
                  Loading tags...
                </div>
              ) : availableTags.length === 0 ? (
                <div className="text-xs text-muted-foreground">
                  No tags available
                </div>
              ) : (
                <div className="space-y-1.5">
                  {availableTags.map((tag) => (
                    <div key={tag} className="flex items-center space-x-2">
                      <Checkbox
                        id={`tag-${tag}`}
                        checked={filters.tags.includes(tag)}
                        onCheckedChange={() => handleTagToggle(tag)}
                      />
                      <Label
                        htmlFor={`tag-${tag}`}
                        className="text-sm font-normal cursor-pointer capitalize"
                      >
                        {tag}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Genres Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Genres</Label>
              {isLoadingGenres ? (
                <div className="text-xs text-muted-foreground">
                  Loading genres...
                </div>
              ) : availableGenres.length === 0 ? (
                <div className="text-xs text-muted-foreground">
                  No genres available
                </div>
              ) : (
                <div className="space-y-1.5">
                  {availableGenres.map((genre) => (
                    <div key={genre} className="flex items-center space-x-2">
                      <Checkbox
                        id={`genre-${genre}`}
                        checked={filters.genres.includes(genre)}
                        onCheckedChange={() => handleGenreToggle(genre)}
                      />
                      <Label
                        htmlFor={`genre-${genre}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {genre}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {hasActiveFilters && (
          <div className="border-t p-3">
            <Button
              variant="outline"
              className="w-full bg-transparent text-sm"
              onClick={handleClearFilters}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

