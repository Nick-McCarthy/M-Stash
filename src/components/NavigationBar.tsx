"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useMobile } from "@/hooks/useMobile";
import { navItems } from "@/lib/site-vars";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useMobile();

  if (isMobile) {
    return (
      <nav className="flex items-center justify-between p-4 border-b bg-background">
        <Link href="/" className="text-xl font-bold">
          M-Stash
        </Link>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[300px] sm:w-[400px] flex flex-col"
          >
            <SheetHeader>
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-4 mt-6 flex-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 text-lg rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
            <div className="mt-auto pt-4 border-t h-20 flex items-center justify-center">
              <ThemeToggle />
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    );
  }

  return (
    <nav className="flex items-center justify-between p-4 border-b bg-background">
      <Link href="/" className="text-xl font-bold">
        M-Stash
      </Link>

      <div className="flex items-center gap-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
        <div className="ml-2 pl-6 border-l">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
