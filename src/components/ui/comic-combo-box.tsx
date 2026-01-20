"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Comic {
  id: number;
  title: string;
  chapters: number;
  status: string;
  type: string;
}

interface ComicComboBoxProps {
  comics: Comic[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ComicComboBox({
  comics,
  value,
  onValueChange,
  placeholder = "Select comic...",
  disabled = false,
}: ComicComboBoxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const isSelectingRef = React.useRef(false);

  const selectedComic = comics.find((comic) => comic.id.toString() === value);

  // Reset search when popover closes (but not if we just selected something)
  React.useEffect(() => {
    if (!open && !isSelectingRef.current) {
      setSearchValue("");
    }
    // Reset the flag after a brief delay
    if (isSelectingRef.current) {
      const timer = setTimeout(() => {
        isSelectingRef.current = false;
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedComic ? (
            <span className="truncate">
              {selectedComic.title} ({selectedComic.chapters} chapters)
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command
          shouldFilter={true}
          value={searchValue}
          onValueChange={setSearchValue}
        >
          <CommandInput placeholder="Search comics..." />
          <CommandList>
            <CommandEmpty>No comics found.</CommandEmpty>
            <CommandGroup>
              {comics.map((comic) => {
                const isSelected = value === comic.id.toString();
                // Create searchable value that includes title, type, and status
                const searchableValue = `${comic.title} ${comic.type} ${comic.status}`;

                const handleSelect = () => {
                  // Mark that we're selecting to prevent search reset
                  isSelectingRef.current = true;
                  // Auto-complete the search input with the full title
                  setSearchValue(comic.title);
                  // Update the selected value
                  onValueChange(comic.id.toString());
                  // Small delay to show the auto-completed text before closing
                  setTimeout(() => {
                    setOpen(false);
                  }, 150);
                };

                return (
                  <CommandItem
                    key={comic.id}
                    value={searchableValue}
                    onSelect={handleSelect}
                    onClick={handleSelect}
                    keywords={[
                      comic.title,
                      comic.type,
                      comic.status,
                      comic.id.toString(),
                    ]}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col flex-1 pointer-events-none">
                      <span className="font-medium">{comic.title}</span>
                      <span className="text-sm text-muted-foreground">
                        {comic.chapters} chapters • {comic.status}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
