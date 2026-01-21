import { TableCell, TableRow } from "@/components/ui/table";

export function EbookTableEmpty() {
  return (
    <TableRow>
      <TableCell colSpan={4} className="text-center py-8">
        <p className="text-muted-foreground">No ebooks found.</p>
        <p className="text-sm text-muted-foreground">
          Try adjusting your search criteria.
        </p>
      </TableCell>
    </TableRow>
  );
}

