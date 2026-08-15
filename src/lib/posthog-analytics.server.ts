import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { formatSupabaseError } from "@/lib/supabase-error";

export type AnalyticsTenantOption = {
  id: string;
  name: string;
  platform_type: string | null;
};

export const getAnalyticsTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AnalyticsTenantOption[]> => {
    const { data: admin, error: adminError } = await context.supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (adminError) throw new Error(formatSupabaseError(adminError));
    if (!admin) throw new Error("Acces refuse : super administrateur de plateforme requis.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("tenants")
      .select("id, name, platform_type")
      .order("name", { ascending: true })
      .limit(500);
    if (error) throw new Error(formatSupabaseError(error));
    return (data ?? []) as AnalyticsTenantOption[];
  });
