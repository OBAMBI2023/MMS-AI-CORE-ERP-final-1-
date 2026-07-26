import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { useCatalogCategoryMutations } from "@/hooks/use-catalog-categories";
import type { CatalogCategory } from "@/services/catalog-categories.service";
import { formatSupabaseError } from "@/lib/supabase-error";

export function NewCategoryDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (category: CatalogCategory) => void;
}) {
  const [name, setName] = useState("");
  const { create } = useCatalogCategoryMutations();

  useEffect(() => {
    if (!open) setName("");
  }, [open]);

  const submit = () => {
    create.mutate(name, {
      onSuccess: (category) => {
        toast.success("Catégorie créée.");
        onCreated?.(category);
        onOpenChange(false);
      },
      onError: (error) => toast.error(formatSupabaseError(error)),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle catégorie</DialogTitle>
          <DialogDescription>
            Elle sera disponible immédiatement dans tous les formulaires du catalogue.
          </DialogDescription>
        </DialogHeader>
        <label className="space-y-2">
          <Label htmlFor="new-category-name">Nom</Label>
          <Input
            id="new-category-name"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
          />
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={!name.trim() || create.isPending}>
            {create.isPending && <Loader2 className="size-4 animate-spin" />}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
