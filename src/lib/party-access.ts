export const PARTY_ACCESS_PERMISSION = "parties.access";

const PARTY_MANAGER_ROLES = new Set(["Administrateur", "Manager", "Gérant"]);

/**
 * Clients and suppliers contain sensitive business contact data.
 * Accountants must additionally receive the explicit RBAC authorization.
 */
export function canAccessParties(
  role: string | null | undefined,
  permissions: Iterable<string> = [],
) {
  if (!role) return false;
  if (PARTY_MANAGER_ROLES.has(role)) return true;
  return role === "Comptable" && new Set(permissions).has(PARTY_ACCESS_PERMISSION);
}

