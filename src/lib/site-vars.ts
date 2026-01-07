import {
  ImageIcon,
  Play,
  BookOpen,
  Settings,
  ArrowDownAZ,
  ArrowDownZA,
  Clock,
  Eye,
  Clapperboard,
} from "lucide-react";

const navItems = [
  { name: "Comics", href: "/comic-library", icon: ImageIcon },
  { name: "Movies", href: "/movie-library", icon: Clapperboard },
  { name: "TV", href: "/tv-library", icon: Play },
  { name: "Ebooks", href: "/ebook-library", icon: BookOpen },
  { name: "Settings", href: "/settings", icon: Settings },
];

export type multiFilterSortOption =
  | "az-asc"
  | "za-desc"
  | "date-updated"
  | "views"
  | undefined;

const multiFilterSortOptions = [
  {
    id: "az-asc" as multiFilterSortOption,
    label: "A-Z Ascending",
    icon: ArrowDownAZ,
  },
  {
    id: "za-desc" as multiFilterSortOption,
    label: "Z-A Descending",
    icon: ArrowDownZA,
  },
  {
    id: "date-updated" as multiFilterSortOption,
    label: "Date Updated",
    icon: Clock,
  },
  { id: "views" as multiFilterSortOption, label: "Views", icon: Eye },
];

export { navItems, multiFilterSortOptions };
