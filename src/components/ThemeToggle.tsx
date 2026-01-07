"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = theme === "dark";

  const handleToggle = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  };

  // Return placeholder with same dimensions until mounted
  // This ensures server and client render identical HTML initially
  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <Sun className="h-4 w-4 text-muted-foreground" />
        <Switch checked={false} disabled />
        <Moon className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  // After mount, render with actual theme state
  return (
    <div className="flex items-center gap-2">
      <Sun
        className={`h-4 w-4 transition-colors ${
          !isDark ? "text-foreground" : "text-muted-foreground"
        }`}
      />
      <Switch 
        checked={isDark} 
        onCheckedChange={handleToggle}
      />
      <Moon
        className={`h-4 w-4 transition-colors ${
          isDark ? "text-foreground" : "text-muted-foreground"
        }`}
      />
    </div>
  );
}
