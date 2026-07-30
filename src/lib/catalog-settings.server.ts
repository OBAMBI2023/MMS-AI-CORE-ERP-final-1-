import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AuthHttpError, requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CatalogSettings } from "@/lib/catalog-settings";

const tenantSchema = z.object({ tenantId: z.string().uuid() });

async function assertCatalogSettingsAccess(
  supabase: any,
  userId: string,
  tenantId: string,
) {
  const [{ data: platformAdmin }, { data: profile }] = await Promise.all([
    supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle(),
    supabase
      .from("profiles")
      .select("tenant_id, role_id, roles(name, tenant_id)")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (platformAdmin) return;
  if (
    profile?.tenant_id !== tenantId ||
    !profile.role_id ||
    profile.roles?.tenant_id !== tenantId
  ) {
    throw new AuthHttpError(403, "Accès refusé aux paramètres de ce tenant.");
  }

  if (profile.roles?.name === "Administrateur") return;

  const { data: permission } = await supabase
    .from("role_permissions")
    .select("permissions!inner(code)")
    .eq("role_id", profile.role_id)
    .eq("permissions.code", "settings.manage")
    .limit(1)
    .maybeSingle();

  if (!permission) {
    throw new AuthHttpError(403, "La permission settings.manage est requise.");
  }
}

export const ensureCatalogSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(tenantSchema)
  .handler(async ({ context, data }): Promise<CatalogSettings> => {
    await assertCatalogSettingsAccess(context.supabase, context.userId, data.tenantId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: insertError } = await supabaseAdmin
      .from("tenant_catalog_settings")
      .upsert({ tenant_id: data.tenantId }, { onConflict: "tenant_id", ignoreDuplicates: true });
    if (insertError) throw new Error(insertError.message);

    const { data: settings, error } = await supabaseAdmin
      .from("tenant_catalog_settings")
      .select("*")
      .eq("tenant_id", data.tenantId)
      .single();

    if (error) throw new Error(error.message);
    return settings as CatalogSettings;
  });
