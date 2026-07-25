import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSignedUrl } from "@/hooks/use-signed-url";

export function useCompanySettings(tenantId?: string | null) {
  const { data: settings, isLoading } = useQuery({
    queryKey: ["parametres", tenantId ?? "legacy"],
    queryFn: async () => {
      let query = supabase.from("parametres").select("*") as any;
      if (tenantId) query = query.eq("tenant_id", tenantId);
      const { data, error } = await query.limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: tenantId !== null,
  });

  const logoUrl = useSignedUrl(settings?.logo_url ?? null);
  const signatureUrl = useSignedUrl(settings?.signature_url ?? null);
  const cachetUrl = useSignedUrl(settings?.cachet_url ?? null);

  return {
    settings,
    logoUrl,
    signatureUrl,
    cachetUrl,
    isLoading,
    companyName: settings?.nomCommercial ?? "Maguy Multi Services",
    address: settings?.adresse ?? "",
    phone: settings?.telephone ?? "",
    email: settings?.email ?? "",
  };
}
