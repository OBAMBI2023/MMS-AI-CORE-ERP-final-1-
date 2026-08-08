import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CATALOG_CATEGORY_ICONS, getCatalogCategoryIcon, type CatalogCategoryIconId } from "@/lib/catalog-category-icons";

/**
 * Visual icon picker for catalog categories. The user only ever sees icon
 * pictures + French labels — the stable id (e.g. "utensils") stored in the
 * database is never shown or typed.
 */
export function CategoryIconPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (icon: CatalogCategoryIconId | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const SelectedIcon = getCatalogCategoryIcon(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start gap-2">
          {SelectedIcon ? (
            <>
              <SelectedIcon className="size-4" aria-hidden="true" />
              {CATALOG_CATEGORY_ICONS.find((entry) => entry.id === value)?.label}
            </>
          ) : (
            <span className="text-muted-foreground">Sélectionner une icône</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Choisir une icône</span>
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
            >
              <X className="size-3" /> Retirer
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {CATALOG_CATEGORY_ICONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={value === id}
              onClick={() => {
                onChange(id);
                setOpen(false);
              }}
              className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-colors hover:border-primary/50 hover:bg-muted ${
                value === id ? "border-primary bg-primary/10" : "border-transparent"
              }`}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span className="w-full truncate text-[10px] text-muted-foreground">{label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
