"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = theme === "dark";

  const handleToggle = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  };

  // Always render the Switch with checked prop to keep it controlled
  // Use a default value when not mounted to avoid hydration mismatch
  const checkedValue = mounted ? isDark : false;

  return (
    <div className="flex items-center gap-2">
      <Sun
        className={`h-4 w-4 transition-colors ${
          !isDark ? "text-foreground" : "text-muted-foreground"
        }`}
      />
      <Switch 
        checked={checkedValue} 
        onCheckedChange={handleToggle}
        disabled={!mounted}
      />
      <Moon
        className={`h-4 w-4 transition-colors ${
          isDark ? "text-foreground" : "text-muted-foreground"
        }`}
      />
    </div>
  );
}
