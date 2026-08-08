import { supabase } from "@/integrations/supabase/client";

export type CatalogCategory = {
  id: string;
  tenant_id: string;
  type: CatalogCategoryType;
  name: string;
  icon: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type CatalogCategoryType = "product" | "service";

const categoryColumns =
  "id, tenant_id, name, icon, type, sort_order, active, created_at, updated_at" as const;

function normalizeName(name: string) {
  const normalized = name.trim().replace(/\s+/g, " ");
  if (!normalized) throw new Error("Le nom de la catégorie est requis.");
  return normalized;
}

function categoryError(error: { code?: string; message: string }) {
  if (error.code === "23505") {
    return new Error("Une catégorie portant ce nom existe déjà.");
  }
  return error;
}

export const catalogCategoriesService = {
  async list(tenantId: string) {
    const { data, error } = await supabase
      .from("catalog_categories")
      .select(categoryColumns)
      .eq("tenant_id", tenantId)
      .order("sort_order");
    if (error) throw error;
    return ((data ?? []) as CatalogCategory[]).sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "fr"),
    );
  },

  async create(
    tenantId: string,
    name: string,
    type: CatalogCategoryType,
    icon?: string | null,
  ) {
    const { data, error } = await supabase
      .from("catalog_categories")
      .insert({ tenant_id: tenantId, name: normalizeName(name), type, icon: icon ?? null })
      .select(categoryColumns)
      .single();
    if (error) throw categoryError(error);
    return data as CatalogCategory;
  },

  async update(
    tenantId: string,
    id: string,
    updates: { name: string; icon?: string | null },
  ) {
    const { data, error } = await supabase
      .from("catalog_categories")
      .update({ name: normalizeName(updates.name), icon: updates.icon ?? null })
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select(categoryColumns)
      .single();
    if (error) throw categoryError(error);
    return data as CatalogCategory;
  },

  async setActive(tenantId: string, id: string, active: boolean) {
    const { data, error } = await supabase
      .from("catalog_categories")
      .update({ active })
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select(categoryColumns)
      .single();
    if (error) throw error;
    return data as CatalogCategory;
  },

  async usageCount(tenantId: string, id: string) {
    const { count, error } = await supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("category_id", id);
    if (error) throw error;
    return count ?? 0;
  },

  async remove(tenantId: string, id: string) {
    const { error } = await supabase
      .from("catalog_categories")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", id);
    if (error) throw error;
  },

  async replaceAndRemove(
    tenantId: string,
    sourceCategoryId: string,
    replacementCategoryId: string,
  ) {
    const { data: ownedCategories, error: ownershipError } = await supabase
      .from("catalog_categories")
      .select("id, active, type")
      .eq("tenant_id", tenantId)
      .in("id", [sourceCategoryId, replacementCategoryId]);
    if (ownershipError) throw ownershipError;
    const sourceOwned = ownedCategories?.some(({ id }) => id === sourceCategoryId);
    const sourceType = ownedCategories?.find(({ id }) => id === sourceCategoryId)?.type;
    const replacementOwnedAndActive = ownedCategories?.some(
      ({ id, active, type }) =>
        id === replacementCategoryId && active && type === sourceType,
    );
    if (!sourceOwned || !replacementOwnedAndActive) {
      throw new Error("Catégorie inaccessible pour ce tenant.");
    }

    const { error } = await supabase.rpc("replace_and_delete_catalog_category", {
      source_category_id: sourceCategoryId,
      replacement_category_id: replacementCategoryId,
    });
    if (error) throw error;
  },
};
