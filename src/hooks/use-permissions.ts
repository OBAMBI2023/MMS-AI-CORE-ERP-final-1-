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
        .select("role_id, roles(name)")
        .eq("id", user.id)
        .single();

      if (error || !data) return { permissions: [], role: null };

      const roleId = data.role_id;
      const roleName = (data.roles as any)?.name;

      // Get all permissions associated with this user's role
      const { data: rolePermissions, error: permsError } = await supabase
        .from("role_permissions")
        .select(`permissions(code)`)
        .eq("role_id", roleId);

      if (permsError) return { permissions: [], role: null };
      
      const permissions = rolePermissions.map(rp => (rp.permissions as any).code);

      return {
        permissions: permissions,
        role: roleName,
        roleId: roleId,
      };
    },
  });
}
