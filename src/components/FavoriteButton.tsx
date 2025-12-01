"use client";

import { useState } from "react";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  defaultFavorited?: boolean;
  onToggle?: (isFavorited: boolean) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function FavoriteButton({
  defaultFavorited = false,
  onToggle,
  size = "md",
  className,
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(defaultFavorited);

  const handleToggle = () => {
    const newState = !isFavorited;
    setIsFavorited(newState);
    onToggle?.(newState);
  };

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={handleToggle}
            className={cn(
              sizeClasses[size],
              isFavorited &&
                "border-orange-500 bg-orange-50 dark:bg-orange-950/20",
              className
            )}
            aria-label={
              isFavorited ? "Remove from favorites" : "Add to favorites"
            }
          >
            <Flame
              size={iconSizes[size]}
              className={cn(
                "transition-all duration-200",
                isFavorited
                  ? "fill-orange-500 text-orange-500 stroke-orange-500"
                  : "text-muted-foreground hover:text-foreground stroke-current"
              )}
              strokeWidth={2}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isFavorited ? "Remove from favorites" : "Add to favorites"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
