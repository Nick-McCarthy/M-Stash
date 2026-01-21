import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { BookOpen, Download } from "lucide-react";
import Link from "next/link";
import type { Ebook } from "./types";

interface EbookTableRowProps {
  ebook: Ebook;
  onDownload: (address: string, title: string) => void;
}

export function EbookTableRow({ ebook, onDownload }: EbookTableRowProps) {
  return (
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
          onClick={() => onDownload(ebook.address, ebook.title)}
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </TableCell>
    </TableRow>
  );
}

