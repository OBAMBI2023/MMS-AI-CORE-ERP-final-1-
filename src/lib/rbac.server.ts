import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function getUserPermissions(
  userId: string,
  supabaseClient?: SupabaseClient<Database>,
) {
  const supabase = supabaseClient || supabaseAdmin;
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
            role_id,
            tenant_id,
            roles(tenant_id)
        `,
    )
    .eq("id", userId)
    .single();

  if (
    error ||
    !data ||
    !data.role_id ||
    (data.roles as { tenant_id?: string } | null)?.tenant_id !== data.tenant_id
  ) return [];

  // Get all permissions associated with this user's role
  const { data: rolePermissions, error: permsError } = await supabase
    .from("role_permissions")
    .select(`permissions(code)`)
    .eq("role_id", data.role_id);

  if (permsError) return [];
  
  return rolePermissions.map(rp => (rp.permissions as any).code);
}
