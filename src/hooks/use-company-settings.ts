import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSignedUrl, useSignedUrlState } from "@/hooks/use-signed-url";
import { useTenant } from "@/providers/TenantProvider";
import { PLATFORM_BRANDING } from "@/config/branding";

export function useCompanySettings(tenantId?: string | null) {
  const { profile, loading: tenantLoading } = useTenant();
  const resolvedTenantId = tenantId === undefined ? profile?.tenant_id ?? null : tenantId;

  const { data: settings, isLoading } = useQuery({
    queryKey: ["parametres", resolvedTenantId],
    queryFn: async () => {
      if (!resolvedTenantId) throw new Error("Tenant ID manquant");
      const { data, error } = await supabase
        .from("parametres")
        .select("*")
        .eq("tenant_id", resolvedTenantId)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: resolvedTenantId !== null,
    staleTime: 5 * 60_000,
  });

  const { url: logoUrl, isLoading: logoLoading } = useSignedUrlState(
    settings?.logo_url ?? null,
  );
  const signatureUrl = useSignedUrl(settings?.signature_url ?? null);
  const cachetUrl = useSignedUrl(settings?.stamp_url ?? null);
  const brandingLoading =
    (tenantId === undefined && tenantLoading) ||
    (resolvedTenantId !== null && (isLoading || logoLoading));

  return {
    settings,
    logoUrl,
    signatureUrl,
    cachetUrl,
    isLoading: brandingLoading,
    companyName:
      settings?.company_name?.trim() ||
      settings?.trade_name?.trim() ||
      PLATFORM_BRANDING.productName,
    address: settings?.address ?? "",
    phone: settings?.phone ?? "",
    email: settings?.email ?? "",
  };
}
