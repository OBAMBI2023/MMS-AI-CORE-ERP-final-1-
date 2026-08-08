import { Tag } from "lucide-react";
import { getCatalogCategoryIcon } from "@/lib/catalog-category-icons";

/** Renders a category's icon, falling back to the generic "Autres" icon when none is configured. */
export function CategoryIcon({
  icon,
  className = "size-4",
}: {
  icon?: string | null;
  className?: string;
}) {
  const Icon = getCatalogCategoryIcon(icon) ?? Tag;
  return <Icon className={className} aria-hidden="true" />;
}
