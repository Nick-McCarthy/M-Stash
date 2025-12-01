"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { GeneralPagination } from "@/components/GeneralPagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/useDebounce";
import { BookOpen, Download } from "lucide-react";
import Link from "next/link";

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

export default function EbookLibrary() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Reset to first page when debounced search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const {
    data: ebooksData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["ebooks", currentPage, debouncedSearch],
    queryFn: () => fetchEbooks(currentPage, debouncedSearch),
  });

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDownload = (address: string, title: string) => {
    // Create a temporary anchor element to trigger download
    const link = document.createElement("a");
    link.href = address;
    link.download = `${title}.epub`; // or extract extension from address
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex justify-center">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Ebook Library</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search by title or author..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md mx-auto"
        />
      </div>

      {/* Table */}
      <div className="mb-6">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Open Ebook</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead className="w-[150px]">Download Ebook</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 15 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-9 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-9 w-24" />
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <p className="text-red-500">Failed to load ebooks</p>
                    <p className="text-sm text-muted-foreground">
                      Please try again later.
                    </p>
                  </TableCell>
                </TableRow>
              ) : ebooksData?.ebooks && ebooksData.ebooks.length > 0 ? (
                ebooksData.ebooks.map((ebook) => (
                  <TableRow key={ebook.id}>
                    <TableCell>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/ebook-library/${ebook.id}`}>
                          <BookOpen className="h-4 w-4 mr-2" />
                          Open
                        </Link>
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{ebook.title}</TableCell>
                    <TableCell>{ebook.author}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleDownload(ebook.address, ebook.title)
                        }
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <p className="text-muted-foreground">No ebooks found.</p>
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your search criteria.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {ebooksData && ebooksData.pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <GeneralPagination
            page={currentPage}
            setPage={handlePageChange}
            totalPages={Math.max(ebooksData.pagination.totalPages, 1)}
          />
        </div>
      )}
    </div>
  );
}
