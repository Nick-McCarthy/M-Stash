"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GeneralPagination } from "@/components/GeneralPagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Book, AlertTriangle, Upload } from "lucide-react";

interface Ebook {
  id: number;
  title: string;
  author: string;
  address: string;
}

interface EbooksResponse {
  ebooks: Ebook[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

async function fetchEbooks(
  page: number,
  search: string
): Promise<EbooksResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    ...(search && { search }),
  });

  const response = await fetch(`/api/ebook-library?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch ebooks");
  }
  return response.json();
}

export default function ManageEbooks() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ebookToDelete, setEbookToDelete] = useState<Ebook | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    file: null as File | null,
  });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // Fetch ebooks for delete tab
  const {
    data: ebooksData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["ebooks", currentPage, debouncedSearch],
    queryFn: () => fetchEbooks(currentPage, debouncedSearch),
  });

  // Create ebook mutation
  const createEbookMutation = useMutation({
    mutationFn: async (formDataToSend: FormData) => {
      const response = await fetch("/api/settings/manage-ebooks/create-ebook", {
        method: "POST",
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create ebook");
      }

      return response.json();
    },
    onSuccess: () => {
      setUploadSuccess(true);
      setFormData({ title: "", author: "", file: null });
      setUploadError(null);
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["ebooks"] });
      // Reset success message after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000);
    },
    onError: (error: Error) => {
      setUploadError(error.message);
      setUploadSuccess(false);
    },
  });

  // Delete ebook mutation
  const deleteEbookMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(
        `/api/settings/manage-ebooks/delete-ebook?id=${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete ebook");
      }

      return response.json();
    },
    onSuccess: () => {
      setDeleteDialogOpen(false);
      setEbookToDelete(null);
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["ebooks"] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, file }));
      setUploadError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setUploadSuccess(false);

    if (!formData.title || !formData.author || !formData.file) {
      setUploadError("Please fill in all fields and select a file");
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append("ebook_title", formData.title);
    formDataToSend.append("ebook_author", formData.author);
    formDataToSend.append("ebook_file", formData.file);

    createEbookMutation.mutate(formDataToSend);
  };

  const handleDeleteClick = (ebook: Ebook) => {
    setEbookToDelete(ebook);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (ebookToDelete) {
      deleteEbookMutation.mutate(ebookToDelete.id);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Book className="h-8 w-8" />
          Manage Ebooks
        </h1>
        <p className="text-muted-foreground mt-2">
          Upload new ebooks or delete existing ones from your library.
        </p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Ebook
          </TabsTrigger>
          <TabsTrigger value="delete" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Delete Ebook
          </TabsTrigger>
        </TabsList>

        {/* Upload Ebook Tab */}
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload New Ebook</CardTitle>
              <CardDescription>
                Add a new ebook to your library. Supported formats: EPUB, PDF,
                MOBI, AZW, AZW3
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="ebook-title">Ebook Title *</Label>
                  <Input
                    id="ebook-title"
                    placeholder="Enter ebook title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ebook-author">Author *</Label>
                  <Input
                    id="ebook-author"
                    placeholder="Enter author name"
                    value={formData.author}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        author: e.target.value,
                      }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ebook-file">Ebook File *</Label>
                  <Input
                    id="ebook-file"
                    type="file"
                    accept=".epub,.pdf,.mobi,.azw,.azw3"
                    onChange={handleFileChange}
                    required
                  />
                  {formData.file && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {formData.file.name}
                    </p>
                  )}
                </div>

                {uploadError && (
                  <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
                    <p className="text-sm text-destructive">{uploadError}</p>
                  </div>
                )}

                {uploadSuccess && (
                  <div className="p-4 border border-green-500/20 bg-green-500/5 rounded-lg">
                    <p className="text-sm text-green-600">
                      Ebook uploaded successfully!
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={
                    !formData.title ||
                    !formData.author ||
                    !formData.file ||
                    createEbookMutation.isPending
                  }
                  className="w-full"
                >
                  {createEbookMutation.isPending ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Upload Ebook
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delete Ebook Tab */}
        <TabsContent value="delete">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Delete Ebook
              </CardTitle>
              <CardDescription>
                Permanently remove ebooks from your library. This action cannot
                be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Search Bar */}
              <div className="space-y-2">
                <Label htmlFor="search-ebooks">Search Ebooks</Label>
                <Input
                  id="search-ebooks"
                  type="text"
                  placeholder="Search by title or author..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 15 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-9 w-20" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : error ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8">
                          <p className="text-red-500">Failed to load ebooks</p>
                          <p className="text-sm text-muted-foreground">
                            Please try again later.
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : ebooksData?.ebooks && ebooksData.ebooks.length > 0 ? (
                      ebooksData.ebooks.map((ebook) => (
                        <TableRow key={ebook.id}>
                          <TableCell className="font-medium">
                            {ebook.title}
                          </TableCell>
                          <TableCell>{ebook.author}</TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClick(ebook)}
                              disabled={deleteEbookMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8">
                          <p className="text-muted-foreground">
                            No ebooks found.
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Try adjusting your search criteria.
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {ebooksData && ebooksData.pagination.totalPages > 1 && (
                <div className="flex justify-center">
                  <GeneralPagination
                    page={currentPage}
                    setPage={setCurrentPage}
                    totalPages={Math.max(ebooksData.pagination.totalPages, 1)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Ebook</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{ebookToDelete?.title}" by{" "}
              {ebookToDelete?.author}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteEbookMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteEbookMutation.isPending}
            >
              {deleteEbookMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
