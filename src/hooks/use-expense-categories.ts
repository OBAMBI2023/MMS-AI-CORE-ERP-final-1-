import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/providers/TenantProvider";
import {
  expenseCategoriesService,
  type ExpenseCategory,
  type ExpenseCategoryInput,
} from "@/services/expense-categories.service";

export const expenseCategoriesKey = (tenantId?: string) =>
  ["expense-categories", tenantId] as const;

export function useExpenseCategories() {
  const { profile, loading } = useTenant();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: expenseCategoriesKey(tenantId),
    queryFn: () => expenseCategoriesService.list(tenantId!),
    enabled: !loading && Boolean(tenantId),
    retry: false,
  });
}

export function useExpenseCategoryMutations() {
  const { profile } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;

  const requireTenant = () => {
    if (!tenantId) throw new Error("Tenant connecté introuvable.");
    return tenantId;
  };
  const refresh = () => queryClient.invalidateQueries({ queryKey: expenseCategoriesKey(tenantId) });

  return {
    create: useMutation({
      mutationFn: (input: ExpenseCategoryInput) =>
        expenseCategoriesService.create(requireTenant(), input),
      onSuccess: (created) => {
        queryClient.setQueryData<ExpenseCategory[]>(
          expenseCategoriesKey(tenantId),
          (current = []) =>
            [...current.filter((item) => item.id !== created.id), created].sort((a, b) =>
              a.name.localeCompare(b.name, "fr"),
            ),
        );
      },
      onSettled: refresh,
    }),
  };
}
