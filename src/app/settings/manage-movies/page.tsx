"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Film, Trash2, Upload } from "lucide-react";
import {
  UploadMovieForm,
  DeleteMovieForm,
} from "@/components/settings/manage-movies";

export default function ManageMovies() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Film className="h-8 w-8" />
          Manage Movies
        </h1>
        <p className="text-muted-foreground mt-2">
          Upload new movies or manage existing content in your library.
        </p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Movie
          </TabsTrigger>
          <TabsTrigger value="delete" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Delete Movie
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <UploadMovieForm />
        </TabsContent>

        <TabsContent value="delete">
          <DeleteMovieForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
