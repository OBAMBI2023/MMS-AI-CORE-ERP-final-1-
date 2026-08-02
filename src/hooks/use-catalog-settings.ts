import { QueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";
import type { CatalogSettings } from "@/lib/catalog-settings";
import { ensureCatalogSettings } from "@/lib/catalog-settings.server";

export const catalogSettingsQueryKey = (tenantId?: string) =>
  ["tenant-catalog-settings", tenantId] as const;

export async function invalidateCatalogDependents(queryClient: QueryClient, tenantId?: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: catalogSettingsQueryKey(tenantId) }),
    queryClient.invalidateQueries({ queryKey: ["services"] }),
    queryClient.invalidateQueries({ queryKey: ["catalog-categories"] }),
    queryClient.invalidateQueries({ queryKey: ["ventes"] }),
    queryClient.invalidateQueries({ queryKey: ["devis"] }),
    queryClient.invalidateQueries({ queryKey: ["dashboard-data-v3"] }),
    queryClient.invalidateQueries({ queryKey: ["reports"] }),
  ]);
}

export function useCatalogSettings(requestedTenantId?: string) {
  const { profile, loading } = useTenant();
  const tenantId = requestedTenantId ?? profile?.tenant_id;

  return useQuery({
    queryKey: catalogSettingsQueryKey(tenantId),
    queryFn: async () => {
      if (!tenantId) throw new Error("Locataire introuvable");
      const { data, error } = await supabase
        .from("tenant_catalog_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as CatalogSettings;
      return ensureCatalogSettings({ data: { tenantId } });
    },
    enabled: Boolean(tenantId) && (Boolean(requestedTenantId) || !loading),
    staleTime: 5 * 60_000,
  });
}
