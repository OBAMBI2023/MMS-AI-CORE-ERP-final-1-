import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";
import { subscriptionQueryKey, type SubscriptionRow } from "@/lib/subscription";

export type TenantSubscriptionRow = SubscriptionRow;

export function useTenantSubscription() {
  const { profile, loading: tenantLoading } = useTenant();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: subscriptionQueryKey(tenantId),
    enabled: !tenantLoading && Boolean(tenantId),
    queryFn: async () => {
      if (!tenantId) throw new Error("Locataire introuvable");
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}
