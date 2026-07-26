import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/providers/TenantProvider";
import {
  catalogCategoriesService,
  type CatalogCategory,
} from "@/services/catalog-categories.service";

export const catalogCategoriesKey = (tenantId?: string) =>
  ["catalog-categories", tenantId] as const;

export function useCatalogCategories(options: { activeOnly?: boolean } = {}) {
  const { profile, loading } = useTenant();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: catalogCategoriesKey(tenantId),
    queryFn: () => catalogCategoriesService.list(tenantId!),
    enabled: !loading && Boolean(tenantId),
    select: options.activeOnly
      ? (categories) => categories.filter((category) => category.active)
      : undefined,
  });
}

export function useCatalogCategoryMutations() {
  const { profile } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;

  const requireTenant = () => {
    if (!tenantId) throw new Error("Tenant connecté introuvable.");
    return tenantId;
  };
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: catalogCategoriesKey(tenantId) }),
      queryClient.invalidateQueries({ queryKey: ["services", tenantId] }),
    ]);
  };

  return {
    create: useMutation({
      mutationFn: (name: string) => catalogCategoriesService.create(requireTenant(), name),
      onSuccess: (created) => {
        queryClient.setQueryData<CatalogCategory[]>(
          catalogCategoriesKey(tenantId),
          (current = []) =>
            [...current.filter((item) => item.id !== created.id), created].sort(
              (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "fr"),
            ),
        );
      },
      onSettled: refresh,
    }),
    rename: useMutation({
      mutationFn: ({ id, name }: { id: string; name: string }) =>
        catalogCategoriesService.rename(requireTenant(), id, name),
      onSuccess: refresh,
    }),
    setActive: useMutation({
      mutationFn: ({ id, active }: { id: string; active: boolean }) =>
        catalogCategoriesService.setActive(requireTenant(), id, active),
      onSuccess: refresh,
    }),
    inspectUsage: (id: string) =>
      catalogCategoriesService.usageCount(requireTenant(), id),
    remove: useMutation({
      mutationFn: (id: string) => catalogCategoriesService.remove(requireTenant(), id),
      onSuccess: refresh,
    }),
    replaceAndRemove: useMutation({
      mutationFn: ({
        sourceId,
        replacementId,
      }: {
        sourceId: string;
        replacementId: string;
      }) =>
        catalogCategoriesService.replaceAndRemove(
          requireTenant(),
          sourceId,
          replacementId,
        ),
      onSuccess: refresh,
    }),
  };
}
