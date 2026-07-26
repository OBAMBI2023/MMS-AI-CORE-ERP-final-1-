import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";

export function usePermissions() {
  const { profile, loading } = useTenant();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["current-user-permissions", tenantId],
    queryFn: async () => {
      if (!tenantId) return { permissions: [], role: null, roleId: null };
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { permissions: [], role: null };

      const { data, error } = await supabase
        .from("profiles")
        .select("role_id, tenant_id, roles(name, tenant_id)")
        .eq("id", user.id)
        .eq("tenant_id", tenantId)
        .single();

      if (error || !data) return { permissions: [], role: null };

      const roleId = data.role_id;
      const roleName = (data.roles as any)?.name;
      if ((data.roles as any)?.tenant_id !== tenantId) {
        return { permissions: [], role: null, roleId: null };
      }

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
    enabled: !loading && Boolean(tenantId),
  });
}
