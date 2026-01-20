"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Upload, Trash2, BookOpen } from "lucide-react";
import {
  CreateComicForm,
  UploadChaptersForm,
  DeleteComicForm,
  DeleteChaptersForm,
} from "@/components/settings/manage-comics";

export default function ManageComics() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-8 w-8" />
          Manage Comics
        </h1>
        <p className="text-muted-foreground mt-2">
          Create new comics, upload chapters, or manage existing content.
        </p>
      </div>

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New Comic
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Chapters
          </TabsTrigger>
          <TabsTrigger value="delete-comic" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Delete Comic
          </TabsTrigger>
          <TabsTrigger
            value="delete-chapters"
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Comic Chapters
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <CreateComicForm />
        </TabsContent>

        <TabsContent value="upload">
          <UploadChaptersForm />
        </TabsContent>

        <TabsContent value="delete-comic">
          <DeleteComicForm />
        </TabsContent>

        <TabsContent value="delete-chapters">
          <DeleteChaptersForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
