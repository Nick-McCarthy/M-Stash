"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageIcon, Clapperboard, Play, BookOpen, ArrowRight, Library, Search, Zap } from "lucide-react";

const mediaTypes = [
  {
    name: "Comics",
    description: "Browse your comic collection and read chapters",
    href: "/comic-library",
    icon: ImageIcon,
    color: "text-blue-500",
  },
  {
    name: "Movies",
    description: "Watch your favorite films and movies",
    href: "/movie-library",
    icon: Clapperboard,
    color: "text-red-500",
  },
  {
    name: "TV Shows",
    description: "Stream TV series and episodes",
    href: "/tv-library",
    icon: Play,
    color: "text-green-500",
  },
  {
    name: "Ebooks",
    description: "Read digital books and manage your library",
    href: "/ebook-library",
    icon: BookOpen,
    color: "text-purple-500",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 sm:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              M-Stash
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Your personal media library. Organize, browse, and enjoy your collection of comics,
            movies, TV shows, and ebooks all in one place.
          </p>
        </div>
      </section>

      {/* Media Type Cards */}
      <section className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {mediaTypes.map((media) => {
            const Icon = media.icon;
            return (
              <Link key={media.name} href={media.href}>
                <Card className="h-full flex flex-col hover:shadow-lg transition-all duration-300 hover:scale-105 border-2 hover:border-primary/50 group">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-center mb-4">
                      <div className="p-4 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                        <Icon className={`h-8 w-8 ${media.color} group-hover:scale-110 transition-transform`} />
                      </div>
                    </div>
                    <CardTitle className="text-center text-xl">{media.name}</CardTitle>
                    <CardDescription className="text-center mt-2">
                      {media.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex items-end">
                    <Button
                      variant="outline"
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    >
                      Browse {media.name}
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Your Media, Your Way</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Library className="h-12 w-12 text-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Organized Collection</h3>
              <p className="text-muted-foreground">
                Keep all your media organized with tags, genres, and custom metadata.
              </p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Search className="h-12 w-12 text-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Easy Discovery</h3>
              <p className="text-muted-foreground">
                Find what you&apos;re looking for with powerful search and filtering options.
              </p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Zap className="h-12 w-12 text-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Fast & Reliable</h3>
              <p className="text-muted-foreground">
                Stream and access your media quickly with optimized performance.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
