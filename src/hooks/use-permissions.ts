import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePermissions() {
  return useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { permissions: [], role: null };

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
        `,
        )
        .eq("id", user.id)
        .single();

      if (error || !data) return { permissions: [], role: null };

      const roleName = data.roles?.name || null;

      // Mode de récupération côté client : Si Administrateur, accorder toutes les permissions
      if (roleName === "Administrateur") {
        const { data: allPerms } = await supabase.from("permissions").select("code");
        return {
          permissions: allPerms?.map((p) => p.code) || [],
          role: roleName,
        };
      }

      return {
        permissions: data.roles?.role_permissions?.map((rp) => rp.permissions?.code) || [],
        role: roleName,
      };
    },
  });
}
