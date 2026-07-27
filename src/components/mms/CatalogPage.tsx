import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ImageIcon, Loader2, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useActionPermission } from "@/hooks/use-action-permission";
import { formatCurrency } from "@/lib/mms/format";
import { generateUUID } from "@/lib/uuid";
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
import { useTenant } from "@/providers/TenantProvider";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { formatSupabaseError } from "@/lib/supabase-error";
import { useCatalogCategories } from "@/hooks/use-catalog-categories";
import { NewCategoryDialog } from "@/components/mms/NewCategoryDialog";
import type { CatalogCategory } from "@/services/catalog-categories.service";
import { useCatalogItems, type CatalogItem } from "@/hooks/use-catalog-items";

const CATALOG_BUCKET = "catalog-images";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

type CatalogForm = {
  type: "product" | "service";
  category_id: string;
  name: string;
  price: string;
  cost_price: string;
  unit: string;
  photo_url: string;
  photo_file: File | null;
  stock: string;
  manage_stock: boolean;
  stock_alert_threshold: string;
  active: boolean;
};

const emptyForm: CatalogForm = {
  type: "service",
  category_id: "",
  name: "",
  price: "0",
  cost_price: "0",
  unit: "unité",
  photo_url: "",
  photo_file: null,
  stock: "",
  manage_stock: false,
  stock_alert_threshold: "0",
  active: true,
};

export function CatalogPage() {
  const { tenant, loading } = useTenant();
  const { profile, refreshTenant } = useTenant();
  const [search, setSearch] = useState("");
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [newCategoryDialogOpen, setNewCategoryDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState<CatalogForm>(emptyForm);
  const canCreate = useActionPermission("services.create");
  const canEdit = useActionPermission("services.edit");
  const canDelete = useActionPermission("services.delete");

  const categoriesQuery = useCatalogCategories({ activeOnly: true });

  useEffect(() => {
    console.log({ loading, profile, tenant });
  }, [loading, profile, tenant]);

  const itemsQuery = useCatalogItems();

  const requireConnectedTenant = async () => {
    console.log({ loading, profile, tenant });
    if (loading) {
      throw new Error("Votre espace de travail est encore en cours de chargement.");
    }
    if (!tenant?.id) {
      throw new Error("Tenant introuvable.");
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (sessionError || !session) {
      throw sessionError ?? new Error("La session utilisateur n’est plus valide. Reconnectez-vous.");
    }
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user || userData.user.id !== session.user.id) {
      throw userError ?? new Error("La session utilisateur n’est plus valide. Reconnectez-vous.");
    }

    const sessionTenant =
      userData.user.app_metadata?.tenant_id ?? userData.user.user_metadata?.tenant_id ?? null;
    let resolvedTenantId = profile?.id === userData.user.id ? profile.tenant_id : null;

    console.info("[Catalogue] Vérification du tenant avant mutation", {
      user_id: userData.user.id,
      tenant_id: tenant?.id ?? null,
      profile_tenant_id: profile?.tenant_id ?? null,
      session_tenant: sessionTenant,
    });

    if (!resolvedTenantId || tenant?.id !== resolvedTenantId) {
      resolvedTenantId = await refreshTenant();
    }

    if (!resolvedTenantId || tenant.id !== resolvedTenantId) {
      console.error("[Catalogue] Tenant absent après recharge automatique", {
        user_id: userData.user.id,
        tenant_id: tenant?.id ?? null,
        profile_tenant_id: profile?.tenant_id ?? null,
        session_tenant: sessionTenant,
      });
      throw new Error("Votre espace de travail est indisponible. Reconnectez-vous puis réessayez.");
    }

    return tenant.id;
  };

  const logCatalogError = (operation: string, error: unknown) => {
    console.error(`[Catalogue] ${operation} refusée`, {
      tenant_id: tenant?.id ?? null,
      user_id: profile?.id ?? null,
      profile_tenant_id: profile?.tenant_id ?? null,
      error: formatSupabaseError(error),
    });
  };

  const filteredItems = useMemo(() => {
    const value = search.trim().toLocaleLowerCase("fr");
    if (!value) return itemsQuery.data ?? [];
    return (itemsQuery.data ?? []).filter((item) =>
      [item.name, item.category, item.type, item.unit].some((field) =>
        field.toLocaleLowerCase("fr").includes(value),
      ),
    );
  }, [itemsQuery.data, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      category_id: categoriesQuery.data?.[0]?.id ?? "",
    });
    setItemDialogOpen(true);
  };

  const openEdit = (item: CatalogItem) => {
    setEditing(item);
    setForm({
      type: item.type,
      category_id: item.category_id ?? "",
      name: item.name,
      price: String(item.price),
      cost_price: String(item.cost_price),
      unit: item.unit,
      photo_url: item.photo_url ?? "",
      photo_file: null,
      stock: item.stock === null ? "" : String(item.stock),
      manage_stock: item.manage_stock,
      stock_alert_threshold: String(item.stock_alert_threshold),
      active: item.active,
    });
    setItemDialogOpen(true);
  };

  const saveItem = useMutation({
    mutationFn: async () => {
      const tenantId = await requireConnectedTenant();
      if (!form.name.trim() || !form.category_id || !form.unit.trim()) {
        throw new Error("Le nom, la catégorie et l’unité sont requis.");
      }
      const price = Number(form.price);
      const costPrice = Number(form.cost_price);
      const stock = form.stock.trim() === "" ? null : Number(form.stock);
      const stockAlertThreshold = Number(form.stock_alert_threshold);
      if (!Number.isFinite(price) || price < 0) throw new Error("Le prix est invalide.");
      if (!Number.isFinite(costPrice) || costPrice < 0) {
        throw new Error("Le prix de revient est invalide.");
      }
      if (stock !== null && (!Number.isFinite(stock) || stock < 0)) {
        throw new Error("Le stock est invalide.");
      }
      if (!Number.isFinite(stockAlertThreshold) || stockAlertThreshold < 0) {
        throw new Error("Le seuil d’alerte est invalide.");
      }
      const manageStock = form.type === "product" && form.manage_stock;
      let uploadedPath: string | null = null;
      if (form.photo_file) {
        const extension = form.photo_file.name.split(".").pop()?.toLowerCase() || "jpg";
        uploadedPath = `${tenantId}/${generateUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from(CATALOG_BUCKET)
          .upload(uploadedPath, form.photo_file, {
            contentType: form.photo_file.type,
            cacheControl: "3600",
          });
        if (uploadError) throw uploadError;
      }
      const payload = {
        tenant_id: tenantId,
        type: form.type,
        category_id: form.category_id,
        name: form.name.trim(),
        price,
        cost_price: form.type === "product" ? costPrice : 0,
        unit: form.unit.trim(),
        photo_url: uploadedPath ?? (form.photo_url.trim() || null),
        manage_stock: manageStock,
        stock: manageStock ? (stock ?? 0) : null,
        stock_alert_threshold: manageStock ? stockAlertThreshold : 0,
        active: form.active,
      };
      if (!tenant?.id || payload.tenant_id !== tenant.id) {
        throw new Error("Tenant introuvable.");
      }
      const { error } = editing
        ? await supabase
            .from("services")
            .update(payload)
            .eq("id", editing.id)
            .eq("tenant_id", tenantId)
        : await supabase.from("services").insert(payload);
      if (error) {
        if (uploadedPath) await supabase.storage.from(CATALOG_BUCKET).remove([uploadedPath]);
        throw error;
      }
      if (editing?.photo_url && editing.photo_url !== payload.photo_url) {
        await supabase.storage.from(CATALOG_BUCKET).remove([editing.photo_url]);
      }
    },
    onSuccess: async () => {
      toast.success(editing ? "Article mis à jour." : "Article créé.");
      setItemDialogOpen(false);
      await itemsQuery.reload();
    },
    onError: (error: Error) => {
      logCatalogError("enregistrement d’article", error);
      toast.error(formatSupabaseError(error));
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const tenantId = await requireConnectedTenant();
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Article supprimé.");
      await itemsQuery.reload();
    },
    onError: (error: Error) => {
      logCatalogError("suppression d’article", error);
      toast.error(formatSupabaseError(error));
    },
  });

  const isLoading = loading || categoriesQuery.isLoading || itemsQuery.loading;
  const loadError =
    itemsQuery.error ??
    (categoriesQuery.error
      ? `Échec du chargement des catégories : ${formatSupabaseError(categoriesQuery.error)}`
      : null);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher dans le catalogue..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {canCreate && (
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Nouvel article
            </Button>
          )}
        </div>
      </div>

      {(categoriesQuery.data?.length ?? 0) === 0 && !isLoading && (
        <Card className="p-5 text-sm text-muted-foreground">
          Créez d’abord une catégorie pour ajouter votre premier produit ou service.
        </Card>
      )}

      <Card className="overflow-hidden">
        {loadError && (
          <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {loadError}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Article</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Unité</th>
                <th className="px-4 py-3 text-right">Prix</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3">Statut</th>
                <th className="w-24 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <Loader2 className="mx-auto size-5 animate-spin" />
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-destructive">
                    Le catalogue n’a pas pu être affiché.
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    Catalogue vide.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
                          <CatalogImage path={item.photo_url} alt={item.name} />
                        </div>
                        <span className="font-medium">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {item.type === "product" ? "Produit" : "Service"}
                    </td>
                    <td className="px-4 py-3">{item.category}</td>
                    <td className="px-4 py-3">{item.unit}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(Number(item.price))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.type === "product" ? (item.stock ?? "—") : "—"}
                    </td>
                    <td className="px-4 py-3">{item.active ? "Actif" : "Inactif"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {canEdit && (
                          <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                            <Pencil className="size-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (window.confirm(`Supprimer « ${item.name} » ?`)) {
                                deleteItem.mutate(item.id);
                              }
                            }}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <CatalogItemDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        editing={editing}
        form={form}
        setForm={setForm}
        categories={categoriesQuery.data ?? []}
        submitting={saveItem.isPending}
        onSubmit={() => saveItem.mutate()}
        canCreateCategory={canCreate}
        onOpenCreateCategory={() => setNewCategoryDialogOpen(true)}
      />

      <NewCategoryDialog
        open={newCategoryDialogOpen}
        onOpenChange={setNewCategoryDialogOpen}
        onCreated={(category) =>
          setForm((current) => ({ ...current, category_id: category.id }))
        }
      />
    </div>
  );
}

function CatalogItemDialog({
  open,
  onOpenChange,
  editing,
  form,
  setForm,
  categories,
  submitting,
  onSubmit,
  canCreateCategory,
  onOpenCreateCategory,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: CatalogItem | null;
  form: CatalogForm;
  setForm: React.Dispatch<React.SetStateAction<CatalogForm>>;
  categories: CatalogCategory[];
  submitting: boolean;
  onSubmit: () => void;
  canCreateCategory: boolean;
  onOpenCreateCategory: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const storedPreview = useSignedUrl(form.photo_url || null, CATALOG_BUCKET);
  const update = <K extends keyof CatalogForm>(key: K, value: CatalogForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (!form.photo_file) {
      setLocalPreview(null);
      return;
    }
    const url = URL.createObjectURL(form.photo_file);
    setLocalPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [form.photo_file]);

  const selectImage = (file?: File) => {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Format non supporté (JPG, PNG, WebP ou AVIF).");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("L’image ne doit pas dépasser 5 Mo.");
      return;
    }
    update("photo_file", file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-xl flex-col gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-2rem)] sm:w-full">
        <DialogHeader className="shrink-0 border-b px-4 py-4 pr-12 sm:px-6">
          <DialogTitle>{editing ? "Modifier l’article" : "Nouvel article"}</DialogTitle>
          <DialogDescription>Produit physique ou service facturable du tenant.</DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto overscroll-contain px-4 py-4 sm:grid-cols-2 sm:px-6">
          <label className="space-y-2">
            <Label>Type</Label>
            <select
              value={form.type}
              onChange={(event) => update("type", event.target.value as CatalogForm["type"])}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="service">Service</option>
              <option value="product">Produit</option>
            </select>
          </label>
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <select
              value={form.category_id}
              onChange={(event) => update("category_id", event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="" disabled>Sélectionner une catégorie</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {canCreateCategory && (
              <Button type="button" variant="outline" size="sm" onClick={onOpenCreateCategory}>
                <Plus className="size-4" />
                Nouvelle catégorie
              </Button>
            )}
          </div>
          <label className="space-y-2 sm:col-span-2">
            <Label>Nom</Label>
            <Input value={form.name} onChange={(event) => update("name", event.target.value)} />
          </label>
          <label className="space-y-2">
            <Label>Prix</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(event) => update("price", event.target.value)}
            />
          </label>
          {form.type === "product" && (
            <label className="space-y-2">
              <Label>Prix de revient</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.cost_price}
                onChange={(event) => update("cost_price", event.target.value)}
              />
            </label>
          )}
          <label className="space-y-2">
            <Label>Unité</Label>
            <Input value={form.unit} onChange={(event) => update("unit", event.target.value)} />
          </label>
          <div className="space-y-2 sm:col-span-2">
            <Label>Photo</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              className="hidden"
              onChange={(event) => {
                selectImage(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            {localPreview || storedPreview ? (
              <div className="flex items-center gap-4 rounded-lg border p-3">
                <img
                  src={localPreview ?? storedPreview ?? ""}
                  alt="Aperçu de l’article"
                  className="size-24 rounded-lg object-cover"
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="size-4" />
                    Remplacer
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setForm((current) => ({ ...current, photo_url: "", photo_file: null }))}
                  >
                    <Trash2 className="size-4 text-destructive" />
                    Supprimer
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="size-4" />
                Téléverser une image
              </Button>
            )}
            <p className="text-xs text-muted-foreground">JPG, PNG, WebP ou AVIF — 5 Mo maximum.</p>
          </div>
          {form.type === "product" && (
            <>
              <div className="flex items-center gap-3 self-end py-1">
                <Switch
                  id="catalog-manage-stock"
                  checked={form.manage_stock}
                  onCheckedChange={(checked) => update("manage_stock", checked)}
                />
                <Label htmlFor="catalog-manage-stock">Gérer le stock</Label>
              </div>
              {form.manage_stock && (
                <>
                  <label className="space-y-1">
                    <Label>Stock initial</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      value={form.stock}
                      onChange={(event) => update("stock", event.target.value)}
                    />
                  </label>
                  <label className="space-y-1">
                    <Label>Seuil d’alerte</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      value={form.stock_alert_threshold}
                      onChange={(event) => update("stock_alert_threshold", event.target.value)}
                    />
                  </label>
                </>
              )}
            </>
          )}
          <div className="flex items-center gap-3 self-end py-1">
            <Switch
              id="catalog-active"
              checked={form.active}
              onCheckedChange={(checked) => update("active", checked)}
            />
            <Label htmlFor="catalog-active">Article actif</Label>
          </div>
        </div>
        <DialogFooter className="shrink-0 gap-2 border-t bg-background px-4 py-3 sm:px-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CatalogImage({ path, alt }: { path: string | null; alt: string }) {
  const url = useSignedUrl(path, CATALOG_BUCKET);
  return url ? (
    <img src={url} alt={alt} className="size-full object-cover" />
  ) : (
    <ImageIcon className="size-4 text-muted-foreground" />
  );
}
