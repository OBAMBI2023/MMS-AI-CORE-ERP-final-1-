import { supabaseAdmin as supabase } from "@/integrations/supabase/client.server";

export async function logAction(
  userId: string,
  roleId: string | null,
  action: string,
  module: string,
  metadata: Record<string, any> = {}
) {
  try {
    await supabase.from("audit_logs").insert({
      user_id: userId,
      role_id: roleId,
      action,
      module,
      metadata,
    });
  } catch (error) {
    console.error("Failed to log audit action:", error);
  }
}
