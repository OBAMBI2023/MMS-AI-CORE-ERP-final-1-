import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { routePermissions } from "@/lib/route-permissions";
import { decideTenantRouteAccess, type TenantAccessDecision } from "@/lib/tenant-route-access";

export const getTenantRouteAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ pathname: z.string().startsWith("/").max(200) }))
  .handler(async ({ context, data }): Promise<TenantAccessDecision> => {
    const permission = routePermissions[data.pathname] ?? null;
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("tenant_id, status, role_id, roles(name, tenant_id)")
      .eq("id", context.userId)
      .maybeSingle();

    const tenantId = profile?.tenant_id ?? null;
    const [{ data: tenant }, { data: subscription }, { data: permissionRow }] = await Promise.all([
      tenantId
        ? context.supabase.from("tenants").select("id, is_active, deleted_at").eq("id", tenantId).maybeSingle()
        : Promise.resolve({ data: null }),
      tenantId
        ? context.supabase.from("subscriptions").select("status, trial_ends_at, ends_at").eq("tenant_id", tenantId).maybeSingle()
        : Promise.resolve({ data: null }),
      permission && profile?.role_id
        ? context.supabase.from("role_permissions").select("permissions!inner(code)").eq("role_id", profile.role_id).eq("permissions.code", permission).limit(1).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const role = profile?.roles as { name?: string; tenant_id?: string } | null;
    const tenantRow = tenant as { is_active?: boolean; deleted_at?: string | null } | null;
    const licenseExpiresAt = subscription?.status === "trial" ? subscription.trial_ends_at : subscription?.ends_at;
    return decideTenantRouteAccess({
      profileExists: Boolean(profile), profileStatus: profile?.status ?? null, tenantId,
      tenantExists: Boolean(tenantRow), tenantActive: tenantRow?.is_active === true,
      tenantDeleted: Boolean(tenantRow?.deleted_at), licenseStatus: subscription?.status ?? null,
      licenseExpiresAt: licenseExpiresAt ?? null,
      roleName: role?.tenant_id === tenantId ? role?.name ?? null : null,
      hasPermission: Boolean(permissionRow),
    }, Boolean(permission));
  });
