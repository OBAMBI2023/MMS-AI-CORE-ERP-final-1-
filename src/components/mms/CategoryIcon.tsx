import { getCatalogCategoryIcon } from "@/lib/catalog-category-icons";

/** Renders a category's icon if one is set; renders nothing when `icon` is null. */
export function CategoryIcon({
  icon,
  className = "size-4",
}: {
  icon?: string | null;
  className?: string;
}) {
  const Icon = getCatalogCategoryIcon(icon);
  if (!Icon) return null;
  return <Icon className={className} aria-hidden="true" />;
}
