import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type HotelSettingsRow = Tables<"hotel_settings">;

export function hotelSettingsQueryKey(tenantId?: string | null) {
  return ["hotel-settings", tenantId] as const;
}

export function useHotelSettings() {
  const { profile, loading: tenantLoading } = useTenant();
  const tenantId = profile?.tenant_id;

  const query = useQuery({
    queryKey: hotelSettingsQueryKey(tenantId),
    enabled: !tenantLoading && Boolean(tenantId),
    queryFn: async () => {
      if (!tenantId) throw new Error("Locataire introuvable");
      const { data: existing, error } = await supabase
        .from("hotel_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error) throw error;
      if (existing) return existing;

      // Première visite : la ligne n'existe pas encore pour ce tenant.
      // tenant_id n'est jamais envoyé : le trigger set_authenticated_hotel_tenant
      // le déduit côté serveur à partir de la session authentifiée.
      const { data: created, error: insertError } = await supabase
        .from("hotel_settings")
        .insert({} as TablesInsert<"hotel_settings">)
        .select("*")
        .single();
      if (insertError) throw insertError;
      return created;
    },
  });

  return query;
}

export function useHotelSettingsRefresh() {
  const qc = useQueryClient();
  const { profile } = useTenant();
  const tenantId = profile?.tenant_id;
  return () => qc.invalidateQueries({ queryKey: hotelSettingsQueryKey(tenantId) });
}
