import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/providers/TenantProvider";
import { expenseCategoriesService, type ExpenseCategory } from "@/services/expense-categories.service";

export const expenseCategoriesKey = (tenantId?: string) => ["expense-categories", tenantId] as const;

export function useExpenseCategories() {
  const { profile, loading } = useTenant();
  return useQuery({ queryKey: expenseCategoriesKey(profile?.tenant_id), queryFn: () => expenseCategoriesService.list(profile!.tenant_id), enabled: !loading && Boolean(profile?.tenant_id), retry: false });
}

export function useExpenseCategoryMutations() {
  const { profile } = useTenant();
  const qc = useQueryClient();
  const tenantId = profile?.tenant_id;
  const requireTenant = () => { if (!tenantId) throw new Error("Tenant connecté introuvable."); return tenantId; };
  const refresh = async () => { await Promise.all([qc.invalidateQueries({ queryKey: expenseCategoriesKey(tenantId) }), qc.invalidateQueries({ queryKey: ["depenses"] })]); };
  return {
    create: useMutation({ mutationFn: (name: string) => expenseCategoriesService.create(requireTenant(), name), onSuccess: (created) => qc.setQueryData<ExpenseCategory[]>(expenseCategoriesKey(tenantId), (old = []) => [...old, created].sort((a, b) => a.name.localeCompare(b.name, "fr"))), onSettled: refresh }),
    rename: useMutation({ mutationFn: ({ id, name }: { id: string; name: string }) => expenseCategoriesService.rename(requireTenant(), id, name), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: string) => expenseCategoriesService.remove(requireTenant(), id), onSuccess: refresh }),
  };
}
