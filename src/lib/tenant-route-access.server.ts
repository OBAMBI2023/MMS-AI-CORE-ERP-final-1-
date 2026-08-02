import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { routePermissions } from "@/lib/route-permissions";
import { decideTenantRouteAccess, type TenantAccessDecision } from "@/lib/tenant-route-access";
import { formatSupabaseError } from "@/lib/supabase-error";

function assertQuerySucceeded(error: unknown, resource: string): asserts error is null {
  if (error) {
    throw new Error(`Lecture ${resource} impossible : ${formatSupabaseError(error)}`);
  }
}

export const getTenantRouteAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ pathname: z.string().startsWith("/").max(200) }))
  .handler(async ({ context, data }): Promise<TenantAccessDecision> => {
    // Materialize due expirations before evaluating access. The service key stays server-only.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: expirationError } = await supabaseAdmin.rpc("expire_due_subscriptions");
    assertQuerySucceeded(expirationError, "des licences");
    const configuredPermission = routePermissions[data.pathname] ?? null;
    const { data: profile, error: profileError } = await context.supabase
      .from("profiles")
      .select("tenant_id, status, role_id, roles(name, tenant_id)")
      .eq("id", context.userId)
      .maybeSingle();
    assertQuerySucceeded(profileError, "du profil");

    const tenantId = profile?.tenant_id ?? null;
    const [tenantResult, subscriptionResult] = await Promise.all([
      tenantId
        ? context.supabase.from("tenants").select("id, is_active, deleted_at, platform_type").eq("id", tenantId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      tenantId
        ? context.supabase.from("subscriptions").select("status, trial_ends_at, ends_at").eq("tenant_id", tenantId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    assertQuerySucceeded(tenantResult.error, "du tenant");
    assertQuerySucceeded(subscriptionResult.error, "de la licence");
    const tenant = tenantResult.data;
    const subscription = subscriptionResult.data;

    const role = profile?.roles as { name?: string; tenant_id?: string } | null;
    const tenantRow = tenant as { is_active?: boolean; deleted_at?: string | null; platform_type?: "ERP" | "HOTEL" } | null;
    const permission = tenantRow?.platform_type === "HOTEL" && data.pathname === "/depenses"
      ? "hotel.expenses.view"
      : configuredPermission;
    const permissionResult = permission && profile?.role_id
      ? await context.supabase.from("role_permissions").select("permissions!inner(code)").eq("role_id", profile.role_id).eq("permissions.code", permission).limit(1).maybeSingle()
      : { data: null, error: null };
    assertQuerySucceeded(permissionResult.error, "des permissions");
    const permissionRow = permissionResult.data;
    const licenseExpiresAt = subscription?.status === "trial" ? subscription.trial_ends_at : subscription?.ends_at;
    return decideTenantRouteAccess({
      profileExists: Boolean(profile), profileStatus: profile?.status ?? null, tenantId,
      tenantExists: Boolean(tenantRow), tenantActive: tenantRow?.is_active === true,
      tenantDeleted: Boolean(tenantRow?.deleted_at), licenseStatus: subscription?.status ?? null,
      platformType: tenantRow?.platform_type,
      licenseExpiresAt: licenseExpiresAt ?? null,
      roleName: role?.tenant_id === tenantId ? role?.name ?? null : null,
      hasPermission: Boolean(permissionRow),
    }, Boolean(permission));
  });
