import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";

type ModuleRelation = { code: string } | { code: string }[] | null;
type TenantModuleListener = () => void;

type TenantModuleSubscription = {
  channel: ReturnType<typeof supabase.channel>;
  listeners: Set<TenantModuleListener>;
  cleanupTimer?: ReturnType<typeof setTimeout>;
};

const tenantModuleSubscriptions = new Map<string, TenantModuleSubscription>();

function subscribeToTenantModules(tenantId: string, listener: TenantModuleListener) {
  const existing = tenantModuleSubscriptions.get(tenantId);
  if (existing) {
    if (existing.cleanupTimer) {
      clearTimeout(existing.cleanupTimer);
      existing.cleanupTimer = undefined;
    }
    existing.listeners.add(listener);
    return () => releaseTenantModuleSubscription(tenantId, listener);
  }

  const listeners = new Set<TenantModuleListener>([listener]);
  const channel = supabase.channel(`tenant-modules-${tenantId}`);
  const subscription: TenantModuleSubscription = { channel, listeners };

  try {
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "tenant_modules",
        filter: `tenant_id=eq.${tenantId}`,
      },
      () => listeners.forEach((notify) => notify()),
    );
    tenantModuleSubscriptions.set(tenantId, subscription);
    channel.subscribe();
  } catch {
    tenantModuleSubscriptions.delete(tenantId);
    void supabase.removeChannel(channel).catch(() => undefined);
  }

  return () => releaseTenantModuleSubscription(tenantId, listener);
}

function releaseTenantModuleSubscription(tenantId: string, listener: TenantModuleListener) {
  const subscription = tenantModuleSubscriptions.get(tenantId);
  if (!subscription) return;

  subscription.listeners.delete(listener);
  if (subscription.listeners.size > 0 || subscription.cleanupTimer) return;

  subscription.cleanupTimer = setTimeout(() => {
    const current = tenantModuleSubscriptions.get(tenantId);
    if (current !== subscription || current.listeners.size > 0) return;

    tenantModuleSubscriptions.delete(tenantId);
    void supabase.removeChannel(current.channel).catch(() => undefined);
  }, 0);
}

export const tenantModulesQueryKey = (tenantId: string | undefined) =>
  ["tenant-modules", tenantId] as const;

export function useTenantModules() {
  const { profile, loading } = useTenant();
  const tenantId = profile?.tenant_id;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenantId) return;
    return subscribeToTenantModules(
      tenantId,
      () => void queryClient.invalidateQueries({ queryKey: tenantModulesQueryKey(tenantId) }),
    );
  }, [queryClient, tenantId]);

  return useQuery({
    queryKey: tenantModulesQueryKey(tenantId),
    queryFn: async () => {
      if (!tenantId) return new Set<string>();
      const { data, error } = await supabase
        .from("tenant_modules")
        .select("enabled, erp_modules!inner(code)")
        .eq("tenant_id", tenantId)
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
    staleTime: 0,
    refetchOnWindowFocus: "always",
    refetchInterval: 30_000,
  });
}
