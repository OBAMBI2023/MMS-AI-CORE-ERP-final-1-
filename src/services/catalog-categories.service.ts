import { supabase } from "@/integrations/supabase/client";

export type CatalogCategory = {
  id: string;
  tenant_id: string;
  name: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const categoryColumns =
  "id, tenant_id, name, sort_order, active, created_at, updated_at" as const;

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

  async create(tenantId: string, name: string) {
    const { data, error } = await supabase
      .from("catalog_categories")
      .insert({ tenant_id: tenantId, name: normalizeName(name) })
      .select(categoryColumns)
      .single();
    if (error) throw categoryError(error);
    return data as CatalogCategory;
  },

  async rename(tenantId: string, id: string, name: string) {
    const { data, error } = await supabase
      .from("catalog_categories")
      .update({ name: normalizeName(name) })
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
      .select("id, active")
      .eq("tenant_id", tenantId)
      .in("id", [sourceCategoryId, replacementCategoryId]);
    if (ownershipError) throw ownershipError;
    const sourceOwned = ownedCategories?.some(({ id }) => id === sourceCategoryId);
    const replacementOwnedAndActive = ownedCategories?.some(
      ({ id, active }) => id === replacementCategoryId && active,
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
