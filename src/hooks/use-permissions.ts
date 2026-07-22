import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePermissions() {
  return useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          roles(
            name,
            role_permissions(
              permissions(code)
            )
          )
        `
        )
        .eq("id", user.id)
        .single();

      if (error || !data) return [];

      // Mode de récupération côté client : Si Administrateur, accorder toutes les permissions
      if (data.roles?.name === 'Administrateur') {
        const { data: allPerms } = await supabase.from('permissions').select('code');
        return allPerms?.map(p => p.code) || [];
      }

      return data.roles?.role_permissions?.map((rp) => rp.permissions?.code) || [];
    },
  });
}
