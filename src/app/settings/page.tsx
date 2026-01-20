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
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

const mediaTypes = [
  { name: "Comics", icon: BookOpen, slug: "comics" },
  { name: "Ebooks", icon: Book, slug: "ebooks" },
  { name: "Movies", icon: Film, slug: "movies" },
  { name: "TV Shows", icon: Tv, slug: "tv-shows" },
];

export default function Settings() {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your media library by creating, updating, or deleting content.
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
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
