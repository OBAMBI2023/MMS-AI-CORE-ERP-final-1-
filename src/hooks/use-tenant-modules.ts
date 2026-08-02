import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";

type ModuleRelation = { code: string } | { code: string }[] | null;

export function useTenantModules() {
  const { profile, loading } = useTenant();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["tenant-modules", tenantId],
    queryFn: async () => {
      if (!tenantId) return new Set<string>();
      const { data, error } = await supabase
        .from("tenant_modules")
        .select("enabled, erp_modules!inner(code)")
        .eq("enabled", true);

      if (error) throw error;

      return new Set(
        (data ?? []).flatMap((row) => {
          const module = row.erp_modules as ModuleRelation;
          if (Array.isArray(module)) return module.map((item) => item.code);
          return module ? [module.code] : [];
        }),
      );
    },
    enabled: !loading && Boolean(tenantId),
    staleTime: 5 * 60_000,
  });
}
