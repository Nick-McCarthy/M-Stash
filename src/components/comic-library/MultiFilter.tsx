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
import type { ComicType, ComicStatus, SortOption } from "@/lib/schemas/comics";

export interface FilterOptions {
  type: ComicType | "all";
  status: ComicStatus | "all";
  sortBy: SortOption;
  tags: string[];
}

interface FilterDrawerProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  availableTags?: string[];
  isLoadingTags?: boolean;
}

export function FilterDrawer({
  filters,
  onFiltersChange,
  availableTags = [],
  isLoadingTags = false,
}: FilterDrawerProps) {
  const [open, setOpen] = React.useState(false);

  const handleTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      type: value as FilterOptions["type"],
    });
  };

  const handleStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      status: value as FilterOptions["status"],
    });
  };

  const handleSortByChange = (value: string) => {
    onFiltersChange({
      ...filters,
      sortBy: value as FilterOptions["sortBy"],
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

  const handleClearFilters = () => {
    onFiltersChange({
      type: "all",
      status: "all",
      sortBy: "az-asc",
      tags: [],
    });
  };

  const hasActiveFilters =
    filters.type !== "all" ||
    filters.status !== "all" ||
    filters.sortBy !== "az-asc" ||
    filters.tags.length > 0;

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
                    (filters.type !== "all" ? 1 : 0) +
                    (filters.status !== "all" ? 1 : 0) +
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
            {/* Types Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Type</Label>
              <RadioGroup value={filters.type} onValueChange={handleTypeChange}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="type-all" />
                  <Label
                    htmlFor="type-all"
                    className="text-sm font-normal cursor-pointer"
                  >
                    All
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="western" id="type-western" />
                  <Label
                    htmlFor="type-western"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Western
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manga" id="type-manga" />
                  <Label
                    htmlFor="type-manga"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Manga
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="webtoon" id="type-webtoon" />
                  <Label
                    htmlFor="type-webtoon"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Webtoon
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Status</Label>
              <RadioGroup
                value={filters.status}
                onValueChange={handleStatusChange}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="status-all" />
                  <Label
                    htmlFor="status-all"
                    className="text-sm font-normal cursor-pointer"
                  >
                    All
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="completed" id="status-completed" />
                  <Label
                    htmlFor="status-completed"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Completed
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ongoing" id="status-ongoing" />
                  <Label
                    htmlFor="status-ongoing"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Ongoing
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hiatus" id="status-hiatus" />
                  <Label
                    htmlFor="hiatus"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Hiatus
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

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
