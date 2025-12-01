"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Book,
  Film,
  Tv,
  Link as LinkIcon,
  Database,
} from "lucide-react";
import Link from "next/link";

const mediaTypes = [
  { name: "Comics", icon: BookOpen, slug: "comics" },
  { name: "Ebooks", icon: Book, slug: "ebooks" },
  { name: "Movies", icon: Film, slug: "movies" },
  { name: "TV Shows", icon: Tv, slug: "tv-shows" },
];

export default function Settings() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your media library by creating, updating, or deleting content.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {mediaTypes.map((media) => (
          <Link key={media.name} href={`/settings/manage-${media.slug}`}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <media.icon className="h-6 w-6" />
                  {media.name}
                </CardTitle>
                <CardDescription>
                  Manage your {media.name.toLowerCase()} collection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Manage {media.name}
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
