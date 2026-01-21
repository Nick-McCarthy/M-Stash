import { TableCell, TableRow } from "@/components/ui/table";

export function EbookTableError() {
  return (
    <TableRow>
      <TableCell colSpan={4} className="text-center py-8">
        <p className="text-red-500">Failed to load ebooks</p>
        <p className="text-sm text-muted-foreground">
          Please try again later.
        </p>
      </TableCell>
    </TableRow>
  );
}

