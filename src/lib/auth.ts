import { supabase } from "@/integrations/supabase/client";

export async function hasPermission(userId: string, permissionCode: string): Promise<boolean> {
  // First, get the user's role
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role_id")
    .eq("id", userId)
    .single();

  if (profileError || !profile?.role_id) return false;

  // Check if the role has the permission
  const { data, error } = await supabase
    .from("role_permissions")
    .select(`
      permissions(code)
    `)
    .eq("role_id", profile.role_id)
    .eq("permissions.code", permissionCode)
    .not("permissions", "is", null);

  if (error || !data || data.length === 0) return false;

  return true;
}
