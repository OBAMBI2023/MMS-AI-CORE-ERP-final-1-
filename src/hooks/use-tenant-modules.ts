import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";

type ModuleRelation = { code: string } | { code: string }[] | null;
type TenantModuleListener = () => void;
const AI_MODULE_CODE = "ai_assistant";
const VALID_AI_SUBSCRIPTION_STATUSES = new Set(["active", "trial"]);

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
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "tenant_ai_subscriptions",
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
      const [{ data, error }, { data: aiSubscription, error: aiSubscriptionError }] = await Promise.all([
        supabase
          .from("tenant_modules")
          .select("enabled, erp_modules!inner(code)")
          .eq("tenant_id", tenantId)
          .eq("enabled", true),
        supabase
          .from("tenant_ai_subscriptions")
          .select("status, expires_at")
          .eq("tenant_id", tenantId)
          .maybeSingle(),
      ]);

      if (error) throw error;
      if (aiSubscriptionError) throw aiSubscriptionError;

      const aiSubscriptionValid = Boolean(
        aiSubscription
        && VALID_AI_SUBSCRIPTION_STATUSES.has(aiSubscription.status)
        && (!aiSubscription.expires_at || new Date(aiSubscription.expires_at).getTime() > Date.now()),
      );

      return new Set(
        (data ?? []).flatMap((row) => {
          const module = row.erp_modules as ModuleRelation;
          const codes = Array.isArray(module) ? module.map((item) => item.code) : module ? [module.code] : [];
          return codes.filter((code) => code !== AI_MODULE_CODE || aiSubscriptionValid);
        }),
      );
    },
    enabled: !loading && Boolean(tenantId),
    staleTime: 0,
    refetchOnWindowFocus: "always",
    refetchInterval: 30_000,
  });
}
