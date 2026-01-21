import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Ebook } from "./types";
import { EbookTableRow } from "./EbookTableRow";
import { EbookTableSkeleton } from "./EbookTableSkeleton";
import { EbookTableError } from "./EbookTableError";
import { EbookTableEmpty } from "./EbookTableEmpty";

interface EbookTableProps {
  ebooks: Ebook[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onDownload: (address: string, title: string) => void;
}

export function EbookTable({
  ebooks,
  isLoading,
  error,
  onDownload,
}: EbookTableProps) {
  return (
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
              <EbookTableSkeleton />
            ) : error ? (
              <EbookTableError />
            ) : ebooks && ebooks.length > 0 ? (
              ebooks.map((ebook) => (
                <EbookTableRow
                  key={ebook.id}
                  ebook={ebook}
                  onDownload={onDownload}
                />
              ))
            ) : (
              <EbookTableEmpty />
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

