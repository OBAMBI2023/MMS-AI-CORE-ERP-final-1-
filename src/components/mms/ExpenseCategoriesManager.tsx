import { useState } from "react";
import { Pencil, Settings2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useExpenseCategories, useExpenseCategoryMutations } from "@/hooks/use-expense-categories";

export function ExpenseCategoriesManager() {
  const [open, setOpen] = useState(false);
  const categories = useExpenseCategories();
  const mutations = useExpenseCategoryMutations();

  const rename = async (id: string, currentName: string) => {
    const name = prompt("Nouveau nom de la catégorie", currentName)?.trim();
    if (!name || name === currentName) return;
    try { await mutations.rename.mutateAsync({ id, name }); toast.success("Catégorie modifiée."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Modification impossible."); }
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Supprimer la catégorie « ${name} » ?`)) return;
    try { await mutations.remove.mutateAsync(id); toast.success("Catégorie supprimée."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Suppression impossible."); }
  };

  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
      <Settings2 className="h-4 w-4" /> Catégories personnalisées
    </button>
    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setOpen(false)}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div><h3 className="font-semibold">Catégories personnalisées</h3><p className="text-xs text-muted-foreground">Les catégories système ne sont pas modifiables.</p></div>
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto p-6">
          {categories.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
          {categories.error && <p className="text-sm text-destructive">Chargement impossible.</p>}
          {categories.data?.map((category) => <div key={category.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <span className="text-sm font-medium">{category.name}</span>
            <div className="flex gap-1">
              <button type="button" aria-label={`Modifier ${category.name}`} onClick={() => void rename(category.id, category.name)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="h-4 w-4" /></button>
              <button type="button" aria-label={`Supprimer ${category.name}`} onClick={() => void remove(category.id, category.name)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>)}
          {!categories.isLoading && !categories.data?.length && <p className="py-6 text-center text-sm text-muted-foreground">Aucune catégorie personnalisée.</p>}
        </div>
      </div>
    </div>}
  </>;
}
