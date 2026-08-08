import {
  Utensils,
  CupSoda,
  UtensilsCrossed,
  Sparkles,
  Shirt,
  Cpu,
  Smartphone,
  Home,
  Briefcase,
  Hammer,
  Car,
  HeartPulse,
  GraduationCap,
  Handshake,
  Wrench,
  ShoppingBag,
  Tag,
  type LucideIcon,
} from "lucide-react";

/**
 * Stable, storable icon ids for catalog categories. Only the id (e.g.
 * "utensils") is persisted in `catalog_categories.icon` — never raw
 * SVG/base64/JSX. Rendering always goes through this registry so the POS and
 * category list never hardcode an icon.
 */
export type CatalogCategoryIconId =
  | "utensils"
  | "cup-soda"
  | "utensils-crossed"
  | "sparkles"
  | "shirt"
  | "cpu"
  | "smartphone"
  | "home"
  | "briefcase"
  | "hammer"
  | "car"
  | "heart-pulse"
  | "graduation-cap"
  | "handshake"
  | "wrench"
  | "shopping-bag"
  | "tag";

export const CATALOG_CATEGORY_ICONS: {
  id: CatalogCategoryIconId;
  label: string;
  Icon: LucideIcon;
}[] = [
  { id: "utensils", label: "Alimentation", Icon: Utensils },
  { id: "cup-soda", label: "Boissons", Icon: CupSoda },
  { id: "utensils-crossed", label: "Restaurant", Icon: UtensilsCrossed },
  { id: "sparkles", label: "Beauté", Icon: Sparkles },
  { id: "shirt", label: "Vêtements", Icon: Shirt },
  { id: "cpu", label: "Électronique", Icon: Cpu },
  { id: "smartphone", label: "Téléphone", Icon: Smartphone },
  { id: "home", label: "Maison", Icon: Home },
  { id: "briefcase", label: "Bureau", Icon: Briefcase },
  { id: "hammer", label: "Quincaillerie", Icon: Hammer },
  { id: "car", label: "Automobile", Icon: Car },
  { id: "heart-pulse", label: "Santé", Icon: HeartPulse },
  { id: "graduation-cap", label: "Éducation", Icon: GraduationCap },
  { id: "handshake", label: "Services", Icon: Handshake },
  { id: "wrench", label: "Outils", Icon: Wrench },
  { id: "shopping-bag", label: "Shopping", Icon: ShoppingBag },
  { id: "tag", label: "Autres", Icon: Tag },
];

const iconById = new Map(CATALOG_CATEGORY_ICONS.map((entry) => [entry.id, entry]));

/** Returns the Lucide icon for a stored icon id, or null if unknown/absent. */
export function getCatalogCategoryIcon(iconId: string | null | undefined): LucideIcon | null {
  if (!iconId) return null;
  return iconById.get(iconId as CatalogCategoryIconId)?.Icon ?? null;
}
