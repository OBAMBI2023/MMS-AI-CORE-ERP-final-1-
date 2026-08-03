import { supabase } from "@/integrations/supabase/client";

export type ExpenseCategory = { id: string; tenant_id: string; name: string; created_at: string; updated_at: string };
const db = supabase as any;

function clean(name: string) {
  const value = name.trim().replace(/\s+/g, " ");
  if (!value) throw new Error("Le nom de la catégorie est requis.");
  if (value.length > 80) throw new Error("Le nom ne peut pas dépasser 80 caractères.");
  return value;
}

function categoryError(error: { code?: string; message: string }) {
  if (error.code === "23505") return new Error("Une catégorie portant ce nom existe déjà.");
  if (error.code === "23503") return new Error("Cette catégorie est encore utilisée par une dépense.");
  return new Error(error.message);
}

export const expenseCategoriesService = {
  async list(tenantId: string) {
    const { data, error } = await db.from("expense_categories").select("*").eq("tenant_id", tenantId).order("name");
    if (error) throw categoryError(error);
    return (data ?? []) as ExpenseCategory[];
  },
  async create(tenantId: string, name: string) {
    const { data, error } = await db.from("expense_categories").insert({ tenant_id: tenantId, name: clean(name) }).select("*").single();
    if (error) throw categoryError(error);
    return data as ExpenseCategory;
  },
  async rename(tenantId: string, id: string, name: string) {
    const { data, error } = await db.from("expense_categories").update({ name: clean(name) }).eq("tenant_id", tenantId).eq("id", id).select("*").single();
    if (error) throw categoryError(error);
    return data as ExpenseCategory;
  },
  async remove(tenantId: string, id: string) {
    const { count, error: usageError } = await db.from("depenses").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("category_id", id);
    if (usageError) throw categoryError(usageError);
    if (count) throw new Error("Cette catégorie est encore utilisée par une dépense.");
    const { error } = await db.from("expense_categories").delete().eq("tenant_id", tenantId).eq("id", id);
    if (error) throw categoryError(error);
  },
};
