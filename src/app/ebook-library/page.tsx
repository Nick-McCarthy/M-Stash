"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { GeneralPagination } from "@/components/GeneralPagination";
import { useDebounce } from "@/hooks/useDebounce";
import { fetchEbooks } from "@/lib/queries/ebooks";
import {
  EbookLibraryHeader,
  EbookSearchBar,
  EbookTable,
} from "@/components/ebook-library";

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
      <EbookLibraryHeader />
      <EbookSearchBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />
      <EbookTable
        ebooks={ebooksData?.ebooks}
        isLoading={isLoading}
        error={error}
        onDownload={handleDownload}
      />
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
