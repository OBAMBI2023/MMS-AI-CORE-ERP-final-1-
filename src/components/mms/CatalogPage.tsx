import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  FolderTree,
  ImageIcon,
  Info,
  Loader2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Ruler,
  Search,
  Settings2,
  ShieldCheck,
  Tag,
  Trash2,
  UploadCloud,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useActionPermission } from "@/hooks/use-action-permission";
import { formatCurrency } from "@/lib/mms/format";
import { generateUUID } from "@/lib/uuid";
import { cn } from "@/lib/utils";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenant } from "@/providers/TenantProvider";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { formatSupabaseError } from "@/lib/supabase-error";
import { useCatalogCategories } from "@/hooks/use-catalog-categories";
import { NewCategoryDialog } from "@/components/mms/NewCategoryDialog";
import type { CatalogCategory } from "@/services/catalog-categories.service";
import { type CatalogItem } from "@/hooks/use-catalog-items";
import { usePaginatedTable, useDebouncedValue } from "@/hooks/use-paginated-table";
import { useCatalogSettings } from "@/hooks/use-catalog-settings";
import { catalogTypeEnabled } from "@/lib/catalog-settings";

const CATALOG_BUCKET = "catalog-images";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const ITEMS_PER_PAGE = 10;
const DUPLICATE_SERVICE_MESSAGE =
  "Un service portant ce nom existe déjà dans cette catégorie.";

function normalizedServiceName(name: string) {
  return name.trim().toLocaleLowerCase("fr");
}

function isDuplicateServiceError(error: { code?: string | null; message?: string | null }) {
  return (
    error.code === "23505" &&
    (error.message?.includes("services_tenant_name_type_key") ?? false)
  );
}

function formatNumberInput(raw: string) {
  if (!raw) return "";
  const [intPart, decimalPart] = raw.split(".");
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return decimalPart !== undefined ? `${withThousands}.${decimalPart}` : withThousands;
}

function parseNumberInput(formatted: string) {
  return formatted.replace(/[^\d.]/g, "");
}

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
  price: "",
  cost_price: "",
  unit: "unité",
  photo_url: "",
  photo_file: null,
  stock: "",
  manage_stock: false,
  stock_alert_threshold: "",
  active: true,
};

export function CatalogPage() {
  const { tenant, loading } = useTenant();
  const { profile, refreshTenant } = useTenant();
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<CatalogForm["type"]>("product");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [newCategoryDialogOpen, setNewCategoryDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState<CatalogForm>(emptyForm);
  const canCreate = useActionPermission("services.create");
  const canEdit = useActionPermission("services.edit");
  const canDelete = useActionPermission("services.delete");
  const catalogSettingsQuery = useCatalogSettings();
  const productEnabled = catalogTypeEnabled(catalogSettingsQuery.data, "product");
  const serviceEnabled = catalogTypeEnabled(catalogSettingsQuery.data, "service");

  useEffect(() => {
    if (catalogSettingsQuery.data && !catalogTypeEnabled(catalogSettingsQuery.data, activeType)) {
      setActiveType(catalogSettingsQuery.data.catalog_mode === "services" ? "service" : "product");
    }
  }, [activeType, catalogSettingsQuery.data]);

  const categoriesQuery = useCatalogCategories({ activeOnly: true });
  const activeCategories = useMemo(
    () => (categoriesQuery.data ?? []).filter((category) => category.type === activeType),
    [activeType, categoriesQuery.data],
  );

  useEffect(() => {
    console.log({ loading, profile, tenant });
  }, [loading, profile, tenant]);

  const qc = useQueryClient();
  const tenantId = tenant?.id;
  const debouncedSearch = useDebouncedValue(search, 300);

  const ITEMS_SELECT_COLUMNS =
    "id, type, category_id, category, name, price, cost_price, unit, photo_url, stock, manage_stock, stock_alert_threshold, active, created_at";

  const itemsQuery = usePaginatedTable<CatalogItem>({
    table: "services",
    tenantId,
    selectColumns: ITEMS_SELECT_COLUMNS,
    searchFields: ["name", "category", "unit"],
    search: debouncedSearch,
    orderBy: { column: "created_at", ascending: false },
    page,
    pageSize: ITEMS_PER_PAGE,
    filters: [
      { column: "type", op: "eq", value: activeType },
      { column: "category_id", op: "eq", value: categoryFilter !== "all" ? categoryFilter : undefined },
      {
        column: "active",
        op: "eq",
        value: statusFilter === "all" ? undefined : statusFilter === "active",
      },
    ],
  });

  // Tab badge counts are independent of the active tab/filters/pagination,
  // so they're two lightweight head-only counts instead of a full fetch.
  const productCountQuery = useQuery({
    queryKey: ["services", "count", "product", tenantId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId as string)
        .eq("type", "product");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: Boolean(tenantId),
  });
  const serviceCountQuery = useQuery({
    queryKey: ["services", "count", "service", tenantId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId as string)
        .eq("type", "service");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: Boolean(tenantId),
  });

  const invalidateCatalogQueries = () => qc.invalidateQueries({ queryKey: ["services"] });

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

  const itemCounts = useMemo(
    () => ({
      product: productCountQuery.data ?? 0,
      service: serviceCountQuery.data ?? 0,
    }),
    [productCountQuery.data, serviceCountQuery.data],
  );

  const paginatedItems = itemsQuery.data?.rows ?? [];
  const totalCount = itemsQuery.data?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  // Kept as an alias so the JSX below (empty-state / "X–Y sur Z" text)
  // reads the true server-side total rather than just the current page.
  const filteredItems = { length: totalCount };

  useEffect(() => {
    setPage(1);
  }, [activeType, categoryFilter, debouncedSearch, statusFilter]);

  useEffect(() => {
    setCategoryFilter("all");
  }, [activeType]);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      type: activeType,
      category_id: activeCategories[0]?.id ?? "",
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
      if (!catalogTypeEnabled(catalogSettingsQuery.data, form.type)) {
        throw new Error("Ce type de catalogue est désactivé pour votre entreprise.");
      }
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
      let duplicateQuery = supabase
        .from("services")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .eq("type", form.type)
        .eq("active", true);
      if (editing) duplicateQuery = duplicateQuery.neq("id", editing.id);
      const { data: activeServices, error: duplicateCheckError } = await duplicateQuery;
      if (duplicateCheckError) throw duplicateCheckError;
      if (
        activeServices?.some(
          (service) =>
            normalizedServiceName(service.name) === normalizedServiceName(form.name),
        )
      ) {
        throw new Error(DUPLICATE_SERVICE_MESSAGE);
      }
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
        if (isDuplicateServiceError(error)) throw new Error(DUPLICATE_SERVICE_MESSAGE);
        throw error;
      }
      if (editing?.photo_url && editing.photo_url !== payload.photo_url) {
        await supabase.storage.from(CATALOG_BUCKET).remove([editing.photo_url]);
      }
    },
    onSuccess: async () => {
      toast.success(editing ? "Article mis à jour." : "Article créé.");
      setItemDialogOpen(false);
      invalidateCatalogQueries();
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
      invalidateCatalogQueries();
    },
    onError: (error: Error) => {
      logCatalogError("suppression d’article", error);
      toast.error(formatSupabaseError(error));
    },
  });

  const isLoading = loading || categoriesQuery.isLoading || itemsQuery.isLoading || catalogSettingsQuery.isLoading;
  const loadError = itemsQuery.error
    ? formatSupabaseError(itemsQuery.error)
    : categoriesQuery.error
      ? `Échec du chargement des catégories : ${formatSupabaseError(categoriesQuery.error)}`
      : null;

  return (
    <div className="space-y-5">
      {(categoriesQuery.data?.length ?? 0) === 0 && !isLoading && (
        <Card className="p-5 text-sm text-muted-foreground">
          Créez d’abord une catégorie pour ajouter votre premier produit ou service.
        </Card>
      )}

      <Tabs
        value={activeType}
        onValueChange={(value) => {
          setActiveType(value as CatalogForm["type"]);
          setCategoryFilter("all");
          setStatusFilter("all");
        }}
      >
        <TabsList className="grid h-auto w-full grid-cols-1 gap-3 bg-transparent p-0 sm:grid-cols-2">
          {productEnabled && <TabsTrigger
            value="product"
            className="h-auto justify-start gap-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-950 data-[state=active]:shadow-md dark:border-blue-900/60 dark:from-blue-950/50 dark:to-background dark:data-[state=active]:border-blue-500"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/30">
              <Package className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-semibold">Produits</span>
              <span className="block text-xs font-normal text-muted-foreground">
                Articles physiques et stock
              </span>
            </span>
            <span className="ml-auto rounded-full bg-blue-100 px-2.5 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {itemCounts.product}
            </span>
          </TabsTrigger>}
          {serviceEnabled && <TabsTrigger
            value="service"
            className="h-auto justify-start gap-4 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md data-[state=active]:border-violet-500 data-[state=active]:bg-violet-50 data-[state=active]:text-violet-950 data-[state=active]:shadow-md dark:border-violet-900/60 dark:from-violet-950/50 dark:to-background dark:data-[state=active]:border-violet-500"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-600 text-white shadow-sm shadow-violet-500/30">
              <Wrench className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-semibold">Services</span>
              <span className="block text-xs font-normal text-muted-foreground">
                Prestations sans gestion de stock
              </span>
            </span>
            <span className="ml-auto rounded-full bg-violet-100 px-2.5 py-1 text-sm font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              {itemCounts.service}
            </span>
          </TabsTrigger>}
        </TabsList>
      </Tabs>

      <Card className="overflow-hidden border-border/70 shadow-sm">
        <div className="flex flex-col gap-3 border-b bg-muted/20 p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Rechercher dans les ${activeType === "product" ? "produits" : "services"}...`}
              className="bg-background pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              aria-label="Filtrer par catégorie"
              className="h-10 min-w-0 rounded-md border border-input bg-background px-3 text-sm sm:w-44"
            >
              <option value="all">Toutes les catégories</option>
              {activeCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | "active" | "inactive")
              }
              aria-label="Filtrer par statut"
              className="h-10 min-w-0 rounded-md border border-input bg-background px-3 text-sm sm:w-36"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
          </div>
          {canCreate && (
            <Button
              onClick={openCreate}
              className={
                activeType === "product"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-violet-600 hover:bg-violet-700"
              }
            >
              <Plus className="size-4" />
              {activeType === "product" ? "Nouveau produit" : "Nouveau service"}
            </Button>
          )}
        </div>
        {loadError && (
          <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {loadError}
          </div>
        )}
        <div className="overflow-x-auto">
          <table
            className={`w-full text-sm ${
              activeType === "product" ? "min-w-[800px]" : "min-w-[700px]"
            }`}
          >
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">
                  {activeType === "product" ? "Article" : "Service"}
                </th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Unité</th>
                <th className="px-4 py-3 text-right">Prix</th>
                {activeType === "product" && (
                  <th className="px-4 py-3 text-right">Stock</th>
                )}
                <th className="px-4 py-3">Statut</th>
                <th className="w-24 px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={activeType === "product" ? 7 : 6} className="py-12 text-center">
                    <Loader2 className="mx-auto size-5 animate-spin" />
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td
                    colSpan={activeType === "product" ? 7 : 6}
                    className="py-12 text-center text-destructive"
                  >
                    Le catalogue n’a pas pu être affiché.
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeType === "product" ? 7 : 6}
                    className="py-12 text-center text-muted-foreground"
                  >
                    Aucun {activeType === "product" ? "produit" : "service"}.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-border transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
                          <CatalogImage path={item.photo_url} alt={item.name} />
                        </div>
                        <span className="font-medium">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{item.category}</td>
                    <td className="px-4 py-3">{item.unit}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(Number(item.price))}
                    </td>
                    {activeType === "product" && (
                      <td className="px-4 py-3 text-right">{item.stock ?? "—"}</td>
                    )}
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
        {!isLoading && !loadError && filteredItems.length > 0 && (
          <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              {(page - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(page * ITEMS_PER_PAGE, filteredItems.length)} sur {filteredItems.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((current) => current - 1)}
              >
                <ChevronLeft className="size-4" />
                Précédent
              </Button>
              <span className="min-w-20 text-center">Page {page} / {pageCount}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === pageCount}
                onClick={() => setPage((current) => current + 1)}
              >
                Suivant
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
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
        productEnabled={productEnabled}
        serviceEnabled={serviceEnabled}
      />

      <NewCategoryDialog
        open={newCategoryDialogOpen}
        onOpenChange={setNewCategoryDialogOpen}
        type={form.type}
        onCreated={(category) =>
          setForm((current) => ({ ...current, category_id: category.id }))
        }
      />
    </div>
  );
}

const SECTION_TONE_CLASSES: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
  green: "bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400",
  orange: "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400",
};

function SectionCard({
  number,
  icon,
  tone,
  title,
  className,
  children,
}: {
  number: number;
  icon: React.ReactNode;
  tone: "blue" | "green" | "orange" | "violet";
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl border border-border/70 bg-card/40 p-4 sm:p-5", className)}>
      <div className="mb-4 flex items-center gap-2.5">
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg",
            SECTION_TONE_CLASSES[tone],
          )}
        >
          {icon}
        </span>
        <h3 className="text-sm font-semibold text-foreground">
          <span className="text-muted-foreground">{number}.</span> {title}
        </h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

const TOGGLE_ROW_TONE_CLASSES: Record<string, { wrap: string; badge: string }> = {
  blue: {
    wrap: "border-blue-100 bg-blue-50/60 dark:border-blue-900/40 dark:bg-blue-950/20",
    badge: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400",
  },
  orange: {
    wrap: "border-orange-100 bg-orange-50/60 dark:border-orange-900/40 dark:bg-orange-950/20",
    badge: "bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400",
  },
  violet: {
    wrap: "border-violet-100 bg-violet-50/60 dark:border-violet-900/40 dark:bg-violet-950/20",
    badge: "bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400",
  },
};

function ToggleRow({
  id,
  icon,
  tone,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  icon: React.ReactNode;
  tone: "blue" | "orange" | "violet";
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const toneClasses = TOGGLE_ROW_TONE_CLASSES[tone];
  return (
    <div className={cn("flex items-center justify-between gap-3 rounded-xl border p-3.5", toneClasses.wrap)}>
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", toneClasses.badge)}>
          {icon}
        </span>
        <div className="min-w-0">
          <Label htmlFor={id} className="cursor-pointer text-sm font-medium">
            {title}
          </Label>
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
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
  productEnabled,
  serviceEnabled,
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
  productEnabled: boolean;
  serviceEnabled: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
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

  const typeLabel = form.type === "product" ? "produit" : "service";
  const hasPreview = Boolean(localPreview || storedPreview);
  const imageSectionNumber = form.type === "product" ? 4 : 3;
  const statusSectionNumber = form.type === "product" ? 5 : 4;
  const actionsSectionNumber = form.type === "product" ? 6 : 5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-h-[calc(100dvh-2rem)] sm:w-full">
        <DialogHeader className="flex shrink-0 flex-row items-center gap-3 space-y-0 border-b px-4 py-4 pr-14 text-left sm:px-6">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            {form.type === "product" ? <Package className="size-5" /> : <Wrench className="size-5" />}
          </span>
          <div className="min-w-0">
            <DialogTitle>
              {editing ? "Modifier" : "Nouveau"} {typeLabel}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? `Modifiez les informations de ce ${typeLabel}.`
                : `Ajoutez un nouveau ${typeLabel} à votre catalogue.`}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
          <SectionCard number={1} tone="blue" icon={<Info className="size-4" />} title="Informations générales">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <Label>Type</Label>
                <div className="relative">
                  <Package className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-blue-500" />
                  <select
                    value={form.type}
                    onChange={(event) => {
                      const type = event.target.value as CatalogForm["type"];
                      setForm((current) => ({
                        ...current,
                        type,
                        category_id:
                          categories.find((category) => category.type === type)?.id ?? "",
                      }));
                    }}
                    className="flex h-10 w-full appearance-none rounded-md border border-input bg-background pl-9 pr-8 text-sm"
                  >
                    {serviceEnabled && <option value="service">Service</option>}
                    {productEnabled && <option value="product">Produit</option>}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </label>

              <div className="space-y-2">
                <Label>Catégorie</Label>
                <div className="relative">
                  <FolderTree className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-blue-500" />
                  <select
                    value={form.category_id}
                    onChange={(event) => update("category_id", event.target.value)}
                    className="flex h-10 w-full appearance-none rounded-md border border-input bg-background pl-9 pr-8 text-sm"
                  >
                    <option value="" disabled>Sélectionner une catégorie</option>
                    {categories
                      .filter((category) => category.type === form.type)
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>
                {categories.filter((category) => category.type === form.type).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Aucune catégorie {typeLabel} disponible.
                  </p>
                )}
                {canCreateCategory && (
                  <Button type="button" variant="outline" size="sm" onClick={onOpenCreateCategory}>
                    <Plus className="size-4" />
                    Nouvelle catégorie
                  </Button>
                )}
              </div>

              <label className="space-y-2 sm:col-span-2">
                <Label>
                  Nom du {typeLabel} <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Tag className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-blue-500" />
                  <Input
                    value={form.name}
                    onChange={(event) => update("name", event.target.value)}
                    placeholder={
                      form.type === "product" ? "Ex. Rame de papier A4 80g" : "Ex. Prestation de conseil"
                    }
                    className="pl-9"
                  />
                </div>
              </label>

              <label className="space-y-2 sm:col-span-2">
                <Label>Unité</Label>
                <div className="relative">
                  <Ruler className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-blue-500" />
                  <Input
                    value={form.unit}
                    onChange={(event) => update("unit", event.target.value)}
                    placeholder="Ex. unité, pièce, kg, litre..."
                    className="pl-9"
                  />
                </div>
              </label>
            </div>
          </SectionCard>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SectionCard number={2} tone="green" icon={<Tag className="size-4" />} title="Tarification">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <Label>
                    Prix de vente <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <DollarSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-green-600" />
                    <Input
                      inputMode="decimal"
                      value={formatNumberInput(form.price)}
                      onChange={(event) => update("price", parseNumberInput(event.target.value))}
                      placeholder="Ex. 5 000"
                      className="pl-9 pr-12"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                      XOF
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Prix auquel le {typeLabel} est vendu</p>
                </label>
                {form.type === "product" && (
                  <label className="space-y-1.5">
                    <Label>Prix de revient</Label>
                    <div className="relative">
                      <DollarSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-green-600" />
                      <Input
                        inputMode="decimal"
                        value={formatNumberInput(form.cost_price)}
                        onChange={(event) => update("cost_price", parseNumberInput(event.target.value))}
                        placeholder="Ex. 3 500"
                        className="pl-9 pr-12"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                        XOF
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Coût d’achat du {typeLabel}</p>
                  </label>
                )}
              </div>
            </SectionCard>

            <SectionCard
              number={imageSectionNumber}
              tone="violet"
              icon={<ImageIcon className="size-4" />}
              title={`Image du ${typeLabel}`}
            >
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
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  selectImage(event.dataTransfer.files?.[0]);
                }}
                className={cn(
                  "flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
                  isDragging
                    ? "border-violet-400 bg-violet-50 dark:bg-violet-950/30"
                    : "border-violet-200 bg-violet-50/40 hover:bg-violet-50 dark:border-violet-900/50 dark:bg-violet-950/10 dark:hover:bg-violet-950/20",
                )}
              >
                <span className="grid size-10 place-items-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400">
                  <UploadCloud className="size-5" />
                </span>
                <span className="text-sm font-medium">Glissez-déposez une image ici</span>
                <span className="text-xs text-muted-foreground">ou cliquez pour parcourir</span>
                <span className="text-xs text-muted-foreground">PNG, JPG, WEBP ou AVIF — 5 Mo maximum</span>
              </button>

              {hasPreview && (
                <div className="mt-3 flex items-center gap-3 rounded-lg border p-3">
                  <img
                    src={localPreview ?? storedPreview ?? ""}
                    alt="Aperçu"
                    className="size-16 shrink-0 rounded-lg object-cover"
                  />
                  <div className="flex flex-1 flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Pencil className="size-3.5" />
                      Remplacer
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setForm((current) => ({ ...current, photo_url: "", photo_file: null }))}
                    >
                      <Trash2 className="size-3.5" />
                      Supprimer
                    </Button>
                  </div>
                </div>
              )}
            </SectionCard>
          </div>

          {form.type === "product" && (
            <SectionCard number={3} tone="orange" icon={<Package className="size-4" />} title="Gestion du stock">
              <ToggleRow
                id="catalog-manage-stock"
                tone="orange"
                icon={<RefreshCw className="size-4" />}
                title="Gérer le stock"
                description="Suivre les entrées et sorties de ce produit"
                checked={form.manage_stock}
                onCheckedChange={(checked) => update("manage_stock", checked)}
              />
              {form.manage_stock && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <label className="space-y-1.5">
                    <Label>Stock initial</Label>
                    <div className="relative">
                      <Package className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-orange-500" />
                      <Input
                        inputMode="decimal"
                        value={formatNumberInput(form.stock)}
                        onChange={(event) => update("stock", parseNumberInput(event.target.value))}
                        placeholder="Ex. 50"
                        className="pl-9"
                      />
                    </div>
                  </label>
                  <label className="space-y-1.5">
                    <Label>Stock minimum</Label>
                    <div className="relative">
                      <Package className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-orange-500" />
                      <Input
                        inputMode="decimal"
                        value={formatNumberInput(form.stock_alert_threshold)}
                        onChange={(event) =>
                          update("stock_alert_threshold", parseNumberInput(event.target.value))
                        }
                        placeholder="Ex. 10"
                        className="pl-9"
                      />
                    </div>
                  </label>
                  <label className="space-y-1.5">
                    <Label>Unité de stock</Label>
                    <div className="relative">
                      <Ruler className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-orange-500" />
                      <Input value={form.unit} disabled readOnly className="pl-9" />
                    </div>
                  </label>
                </div>
              )}
            </SectionCard>
          )}

          <SectionCard number={statusSectionNumber} tone="violet" icon={<ShieldCheck className="size-4" />} title="Statut">
            <div className={cn("grid grid-cols-1 gap-3", form.type === "product" && "sm:grid-cols-2")}>
              <ToggleRow
                id="catalog-active"
                tone="blue"
                icon={form.type === "product" ? <Package className="size-4" /> : <Wrench className="size-4" />}
                title={form.type === "product" ? "Produit actif" : "Service actif"}
                description="Disponible à la vente et dans le catalogue"
                checked={form.active}
                onCheckedChange={(checked) => update("active", checked)}
              />
              {form.type === "product" && (
                <ToggleRow
                  id="catalog-manage-stock-status"
                  tone="violet"
                  icon={<RefreshCw className="size-4" />}
                  title="Gérer le stock"
                  description="Suivre les entrées et sorties de ce produit"
                  checked={form.manage_stock}
                  onCheckedChange={(checked) => update("manage_stock", checked)}
                />
              )}
            </div>
          </SectionCard>
        </div>

        <DialogFooter className="shrink-0 flex-col items-stretch gap-3 border-t bg-background px-4 py-3 sm:flex-col sm:items-stretch sm:justify-start sm:space-x-0 sm:px-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Settings2 className="size-4 text-muted-foreground" />
            {actionsSectionNumber}. Actions
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Annuler
            </Button>
            <Button onClick={onSubmit} disabled={submitting} className="w-full sm:w-auto">
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Enregistrer
            </Button>
          </div>
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
