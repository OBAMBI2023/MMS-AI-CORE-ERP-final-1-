import { useEffect, useState } from "react";
import {
  Banknote,
  Briefcase,
  Car,
  Coffee,
  Home,
  Loader2,
  Megaphone,
  Package,
  Receipt,
  ShoppingCart,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useExpenseCategories, useExpenseCategoryMutations } from "@/hooks/use-expense-categories";
import type { ExpenseCategory } from "@/services/expense-categories.service";
import { formatSupabaseError } from "@/lib/supabase-error";
import { cn } from "@/lib/utils";

const COLOR_SWATCHES = [
  "#3B82F6",
  "#8B5CF6",
  "#F59E0B",
  "#14B8A6",
  "#6366F1",
  "#F43F5E",
  "#EC4899",
  "#84CC16",
  "#0EA5E9",
  "#6B7280",
];

const ICON_OPTIONS: { key: string; icon: LucideIcon }[] = [
  { key: "Receipt", icon: Receipt },
  { key: "Home", icon: Home },
  { key: "Package", icon: Package },
  { key: "Truck", icon: Truck },
  { key: "Wallet", icon: Wallet },
  { key: "Megaphone", icon: Megaphone },
  { key: "Banknote", icon: Banknote },
  { key: "ShoppingCart", icon: ShoppingCart },
  { key: "Briefcase", icon: Briefcase },
  { key: "Coffee", icon: Coffee },
  { key: "Car", icon: Car },
];

export function NewExpenseCategoryDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (category: ExpenseCategory) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [icon, setIcon] = useState<string | null>(null);
  const { data: categories = [] } = useExpenseCategories();
  const { create } = useExpenseCategoryMutations();

  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setColor(null);
      setIcon(null);
    }
  }, [open]);

  const normalized = name.trim().toLowerCase();
  const duplicate =
    normalized.length > 0 && categories.some((c) => c.name.trim().toLowerCase() === normalized);

  const submit = () => {
    if (!name.trim() || duplicate || create.isPending) return;
    create.mutate(
      { name, description: description.trim() || null, color, icon },
      {
        onSuccess: (category) => {
          toast.success("Catégorie créée.");
          onCreated?.(category);
          onOpenChange(false);
        },
        onError: (error) => toast.error(formatSupabaseError(error)),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle catégorie de dépense</DialogTitle>
          <DialogDescription>
            Elle sera disponible immédiatement dans le formulaire de dépense.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label className="block space-y-2">
            <Label htmlFor="new-expense-category-name">
              Nom <span className="text-destructive">*</span>
            </Label>
            <Input
              id="new-expense-category-name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit();
              }}
            />
            {duplicate && <p className="text-xs text-destructive">Cette catégorie existe déjà.</p>}
          </label>
          <label className="block space-y-2">
            <Label htmlFor="new-expense-category-description">Description (facultative)</Label>
            <Textarea
              id="new-expense-category-description"
              rows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <div className="space-y-2">
            <Label>Couleur (optionnelle)</Label>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  aria-label={`Couleur ${swatch}`}
                  onClick={() => setColor((current) => (current === swatch ? null : swatch))}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform",
                    color === swatch ? "scale-110 border-foreground" : "border-transparent",
                  )}
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Icône (optionnelle)</Label>
            <div className="flex flex-wrap items-center gap-2">
              {ICON_OPTIONS.map(({ key, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  aria-label={key}
                  onClick={() => setIcon((current) => (current === key ? null : key))}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                    icon === key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={!name.trim() || duplicate || create.isPending}>
            {create.isPending && <Loader2 className="size-4 animate-spin" />}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
