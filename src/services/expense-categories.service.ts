import { supabase } from "@/integrations/supabase/client";

export type ExpenseCategory = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
};

export type ExpenseCategoryInput = {
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
};

const categoryColumns =
  "id, tenant_id, name, description, color, icon, created_at, updated_at" as const;

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

export const expenseCategoriesService = {
  async list(tenantId: string) {
    const { data, error } = await supabase
      .from("expense_categories")
      .select(categoryColumns)
      .eq("tenant_id", tenantId)
      .order("name");
    if (error) throw error;
    return ((data ?? []) as ExpenseCategory[]).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  },

  async create(tenantId: string, input: ExpenseCategoryInput) {
    const { data, error } = await supabase
      .from("expense_categories")
      .insert({
        tenant_id: tenantId,
        name: normalizeName(input.name),
        description: input.description?.trim() || null,
        color: input.color || null,
        icon: input.icon || null,
      })
      .select(categoryColumns)
      .single();
    if (error) throw categoryError(error);
    return data as ExpenseCategory;
  },
};
