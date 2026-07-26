import { useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { NewCategoryDialog } from "@/components/mms/NewCategoryDialog";
import {
  useCatalogCategories,
  useCatalogCategoryMutations,
} from "@/hooks/use-catalog-categories";
import { useActionPermission } from "@/hooks/use-action-permission";
import type { CatalogCategory } from "@/services/catalog-categories.service";
import { formatSupabaseError } from "@/lib/supabase-error";
import { useTenant } from "@/providers/TenantProvider";

export function CategoriesPage() {
  const { profile, loading: tenantLoading } = useTenant();
  const categoriesQuery = useCatalogCategories();
  const mutations = useCatalogCategoryMutations();
  const canCreate = useActionPermission("services.create");
  const canEdit = useActionPermission("services.edit");
  const canDelete = useActionPermission("services.delete");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogCategory | null>(null);
  const [editedName, setEditedName] = useState("");
  const [deleting, setDeleting] = useState<CatalogCategory | null>(null);
  const [usageCount, setUsageCount] = useState<number | null>(null);
  const [replacementId, setReplacementId] = useState("");
  const [checkingUsage, setCheckingUsage] = useState(false);

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("fr");
    return (categoriesQuery.data ?? []).filter(
      (category) => !needle || category.name.toLocaleLowerCase("fr").includes(needle),
    );
  }, [categoriesQuery.data, search]);

  const openDelete = async (category: CatalogCategory) => {
    setDeleting(category);
    setUsageCount(null);
    setReplacementId("");
    setCheckingUsage(true);
    try {
      setUsageCount(await mutations.inspectUsage(category.id));
    } catch (error) {
      toast.error(formatSupabaseError(error));
      setDeleting(null);
    } finally {
      setCheckingUsage(false);
    }
  };

  const submitDelete = () => {
    if (!deleting || usageCount === null) return;
    const mutation = usageCount > 0 ? mutations.replaceAndRemove : mutations.remove;
    const variables =
      usageCount > 0
        ? { sourceId: deleting.id, replacementId }
        : deleting.id;
    mutation.mutate(variables as never, {
      onSuccess: () => {
        toast.success(
          usageCount > 0
            ? "Catégorie remplacée puis supprimée."
            : "Catégorie supprimée.",
        );
        setDeleting(null);
      },
      onError: (error) => toast.error(formatSupabaseError(error)),
    });
  };

  const replacements = (categoriesQuery.data ?? []).filter(
    (category) => category.active && category.id !== deleting?.id,
  );
  const deletingPending =
    mutations.remove.isPending || mutations.replaceAndRemove.isPending;

  if (tenantLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="sr-only">Chargement de l’espace de travail…</span>
      </div>
    );
  }

  if (!profile?.tenant_id) {
    return (
      <Card className="p-6 text-center text-sm text-destructive">
        Tenant connecté introuvable. Veuillez vous reconnecter.
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher une catégorie..."
            className="pl-9"
          />
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nouvelle catégorie
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Statut</th>
                <th className="w-32 px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categoriesQuery.isLoading ? (
                <tr><td colSpan={3} className="py-12 text-center"><Loader2 className="mx-auto size-5 animate-spin" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={3} className="py-12 text-center text-muted-foreground">Aucune catégorie.</td></tr>
              ) : filtered.map((category) => (
                <tr key={category.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{category.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={category.active}
                        disabled={!canEdit || mutations.setActive.isPending}
                        onCheckedChange={(active) =>
                          mutations.setActive.mutate(
                            { id: category.id, active },
                            {
                              onSuccess: () => toast.success(active ? "Catégorie activée." : "Catégorie désactivée."),
                              onError: (error) => toast.error(formatSupabaseError(error)),
                            },
                          )
                        }
                        aria-label={`${category.active ? "Désactiver" : "Activer"} ${category.name}`}
                      />
                      <Badge variant={category.active ? "default" : "secondary"}>
                        {category.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {canEdit && (
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditing(category);
                          setEditedName(category.name);
                        }}>
                          <Pencil className="size-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="icon" onClick={() => void openDelete(category)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <NewCategoryDialog open={createOpen} onOpenChange={setCreateOpen} />

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer la catégorie</DialogTitle>
            <DialogDescription>Le nouveau nom sera répercuté dans tout le catalogue.</DialogDescription>
          </DialogHeader>
          <label className="space-y-2">
            <Label htmlFor="category-edit-name">Nom</Label>
            <Input id="category-edit-name" value={editedName} onChange={(event) => setEditedName(event.target.value)} />
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
            <Button
              disabled={!editedName.trim() || mutations.rename.isPending}
              onClick={() => editing && mutations.rename.mutate(
                { id: editing.id, name: editedName },
                {
                  onSuccess: () => { toast.success("Catégorie renommée."); setEditing(null); },
                  onError: (error) => toast.error(formatSupabaseError(error)),
                },
              )}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer « {deleting?.name} »</DialogTitle>
            <DialogDescription>
              {checkingUsage
                ? "Vérification de l’utilisation..."
                : usageCount
                  ? `${usageCount} article(s) utilisent cette catégorie. Choisissez une catégorie de remplacement.`
                  : "Cette catégorie n’est utilisée par aucun article et peut être supprimée."}
            </DialogDescription>
          </DialogHeader>
          {usageCount !== null && usageCount > 0 && (
            <label className="space-y-2">
              <Label htmlFor="replacement-category">Catégorie de remplacement</Label>
              <select
                id="replacement-category"
                value={replacementId}
                onChange={(event) => setReplacementId(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Sélectionner...</option>
                {replacements.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
              {replacements.length === 0 && (
                <p className="text-sm text-destructive">Créez ou activez une autre catégorie avant de continuer.</p>
              )}
            </label>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Annuler</Button>
            <Button
              variant="destructive"
              disabled={checkingUsage || usageCount === null || (usageCount > 0 && !replacementId) || deletingPending}
              onClick={submitDelete}
            >
              {deletingPending && <Loader2 className="size-4 animate-spin" />}
              {usageCount ? "Remplacer et supprimer" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
