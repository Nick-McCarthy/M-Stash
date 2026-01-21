import { Input } from "@/components/ui/input";

interface EbookSearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export function EbookSearchBar({
  searchTerm,
  onSearchChange,
}: EbookSearchBarProps) {
  return (
    <div className="mb-6">
      <Input
        type="text"
        placeholder="Search by title or author..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-md mx-auto"
      />
    </div>
  );
}

