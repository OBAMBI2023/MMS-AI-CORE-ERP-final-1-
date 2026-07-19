import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function getUserPermissions(userId: string, supabaseClient?: SupabaseClient<Database>) {
    const supabase = supabaseClient || supabaseAdmin;
    const { data, error } = await supabase
        .from("profiles")
        .select(`
            roles(
                role_permissions(
                    permissions(code)
                )
            )
        `)
        .eq("id", userId)
        .single();
    
    if (error || !data) return [];
    
    // Flatten the nested structure
    return data.roles?.role_permissions?.map(rp => rp.permissions?.code) || [];
}
