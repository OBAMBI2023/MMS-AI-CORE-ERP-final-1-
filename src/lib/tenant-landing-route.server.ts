import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types.ts";
import { formatSupabaseError } from "./supabase-error.ts";
import { routePermissions } from "./route-permissions.ts";
import { getRouteModule } from "./route-modules.ts";
import { canAccessParties } from "./party-access.ts";

export type AuthenticatedDestination =
  | "/super-admin"
  | "/partner"
  | "/app"
  | "/app/assistant-ia"
  | "/ventes"
  | "/services"
  | "/clients"
  | "/devis"
  | "/achats"
  | "/depenses"
  | "/rapports"
  | "/stock"
  | "/fournisseurs"
  | "/categories"
  | "/parametres"
  | "/settings/users"
  | "/utilisateurs"
  | "/settings/catalogue"
  | "/403";

// Ordre imposé par le produit : Dashboard puis les écrans opérationnels les
// plus courants, avant tout le reste des routes protégées par permission.
const TENANT_LANDING_PRIORITY: readonly Exclude<
  AuthenticatedDestination,
  "/super-admin" | "/partner" | "/403"
>[] = [
  "/app",
  "/ventes",
  "/services",
  "/clients",
  "/devis",
  "/achats",
  "/depenses",
  "/rapports",
  "/stock",
  "/fournisseurs",
  "/categories",
  "/app/assistant-ia",
  "/parametres",
  "/settings/users",
  "/utilisateurs",
  "/settings/catalogue",
];

const CATALOG_GATED_ROUTES = new Set(["/stock", "/achats", "/fournisseurs"]);

async function isRouteAccessible(
  supabase: SupabaseClient<Database>,
  roleName: string | null,
  permissions: string[],
  path: string,
): Promise<boolean> {
  const requiredModule = getRouteModule(path);
  if (requiredModule) {
    const { data: moduleEnabled, error } = await supabase.rpc("current_user_module_enabled", {
      requested_code: requiredModule,
    });
    if (error || !moduleEnabled) return false;
  }

  if (CATALOG_GATED_ROUTES.has(path)) {
    const { data: catalogRouteAllowed, error } = await supabase.rpc(
      "current_user_catalog_route_enabled",
      { requested_path: path },
    );
    if (error || !catalogRouteAllowed) return false;
  }

  const requiredPermission = routePermissions[path];
  if (requiredPermission) {
    let isAuthorized = roleName === "Administrateur" || permissions.includes(requiredPermission);

    if (path === "/clients" || path === "/fournisseurs") {
      isAuthorized = canAccessParties(roleName, isAuthorized ? [requiredPermission] : []);
    }

    if (!isAuthorized) return false;
  }

  return true;
}

/**
 * Détermine la première route accessible d'un utilisateur secondaire, dans
 * l'ordre métier imposé (Dashboard, Ventes POS, ...). Les mêmes conditions
 * que le garde de src/routes/__root.tsx sont réévaluées ici pour qu'un
 * utilisateur ne soit jamais redirigé vers une route qui le renverrait
 * ensuite vers /403.
 */
export async function resolveTenantLandingRoute(
  supabase: SupabaseClient<Database>,
  userId: string,
  tenantId: string,
): Promise<AuthenticatedDestination> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role_id, tenant_id, roles(name, tenant_id)")
    .eq("id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (profileError) throw new Error(formatSupabaseError(profileError));

  const roleName =
    profile?.roles && (profile.roles as { tenant_id?: string } | null)?.tenant_id === tenantId
      ? (profile.roles as { name: string }).name
      : null;
  const roleId = roleName ? profile?.role_id : null;

  let permissions: string[] = [];
  if (roleId) {
    const { data: rolePermissions, error: permsError } = await supabase
      .from("role_permissions")
      .select("permissions(code)")
      .eq("role_id", roleId);
    if (permsError) throw new Error(formatSupabaseError(permsError));
    permissions = (rolePermissions ?? []).map((row) => (row.permissions as { code: string } | null)?.code)
      .filter((code): code is string => Boolean(code));
  }

  for (const candidate of TENANT_LANDING_PRIORITY) {
    if (await isRouteAccessible(supabase, roleName, permissions, candidate)) {
      return candidate;
    }
  }

  return "/403";
}
