import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSignedUrl } from "@/hooks/use-signed-url";

export function useCompanySettings() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ["parametres"],
    queryFn: async () => {
      const { data, error } = await supabase.from("parametres").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const logoUrl = useSignedUrl(settings?.logo_url ?? null);

  return {
    settings,
    logoUrl,
    isLoading,
    companyName: settings?.company_name ?? "Maguy Multi Services",
    address: settings?.address ?? "",
    phone: settings?.phone ?? "",
    email: settings?.email ?? "",
  };
}
