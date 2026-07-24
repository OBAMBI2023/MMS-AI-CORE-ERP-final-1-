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
            role_id
        `,
    )
    .eq("id", userId)
    .single();

  if (error || !data) return [];

  // Get all permissions associated with this user's role
  const { data: rolePermissions, error: permsError } = await supabase
    .from("role_permissions")
    .select(`permissions(code)`)
    .eq("role_id", data.role_id);

  if (permsError) return [];
  
  return rolePermissions.map(rp => (rp.permissions as any).code);
}
