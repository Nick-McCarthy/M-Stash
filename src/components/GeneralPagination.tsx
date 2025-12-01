import React, { useMemo, useCallback } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

interface GeneralPaginationProps {
  page: number;
  setPage: (value: number) => void;
  totalPages: number;
}

export function GeneralPagination({
  page,
  setPage,
  totalPages,
}: GeneralPaginationProps) {
  const normalizedTotalPages = Math.max(1, totalPages);
  const currentPage = Math.min(Math.max(1, page), normalizedTotalPages);

  const getPageNumbers = useMemo(() => {
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    for (let i = 1; i <= normalizedTotalPages; i++) {
      if (
        i === 1 ||
        i === normalizedTotalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push("...");
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  }, [currentPage, normalizedTotalPages]);

  const handlePrevious = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (currentPage > 1) setPage(currentPage - 1);
    },
    [currentPage, setPage]
  );

  const handleNext = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (currentPage < normalizedTotalPages) setPage(currentPage + 1);
    },
    [currentPage, normalizedTotalPages, setPage]
  );

  const handlePageClick = useCallback(
    (e: React.MouseEvent, pageNum: number) => {
      e.preventDefault();
      setPage(pageNum);
    },
    [setPage]
  );

  return (
    <nav
      aria-label="Pagination Navigation"
      className="flex justify-center max-w-5xl mx-auto w-full"
    >
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              aria-disabled={currentPage === 1}
              className={cn(
                currentPage === 1 && "pointer-events-none opacity-50"
              )}
              onClick={handlePrevious}
              aria-label="Go to previous page"
            />
          </PaginationItem>

          {getPageNumbers.map((pageNum, idx) => (
            <PaginationItem key={idx}>
              {pageNum === "..." ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  href="#"
                  isActive={currentPage === pageNum}
                  onClick={(e) => handlePageClick(e, pageNum as number)}
                  aria-label={`Go to page ${pageNum}`}
                  aria-current={currentPage === pageNum ? "page" : undefined}
                  className={cn(
                    "transition-all duration-200",
                    currentPage === pageNum &&
                      "ring-1 ring-offset-2 ring-primary"
                  )}
                >
                  {pageNum}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              href="#"
              aria-disabled={currentPage === normalizedTotalPages}
              className={cn(
                currentPage === normalizedTotalPages &&
                  "pointer-events-none opacity-50"
              )}
              onClick={handleNext}
              aria-label="Go to next page"
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </nav>
  );
}
