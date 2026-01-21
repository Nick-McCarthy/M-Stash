import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

export function EbookTableSkeleton() {
  return (
    <>
      {Array.from({ length: 15 }).map((_, i) => (
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
      ))}
    </>
  );
}

