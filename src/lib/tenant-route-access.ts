export type TenantAccessFacts = {
  profileExists: boolean;
  profileStatus: string | null;
  tenantId: string | null;
  tenantExists: boolean;
  tenantActive: boolean;
  tenantDeleted: boolean;
  platformType?: "ERP" | "HOTEL";
  licenseStatus: string | null;
  licenseExpiresAt: string | null;
  roleName: string | null;
  hasPermission: boolean;
};

export type TenantAccessDecision =
  | { allowed: true; tenantId: string; roleName: string; platformType: "ERP" | "HOTEL" }
  | { allowed: false; reason: "profile" | "tenant" | "license" | "role" | "permission" };

export function decideTenantRouteAccess(
  facts: TenantAccessFacts,
  permissionRequired: boolean,
  now = Date.now(),
): TenantAccessDecision {
  if (!facts.profileExists || facts.profileStatus !== "active") return { allowed: false, reason: "profile" };
  if (!facts.tenantId || !facts.tenantExists || !facts.tenantActive || facts.tenantDeleted) {
    return { allowed: false, reason: "tenant" };
  }
  const expiresAt = facts.licenseExpiresAt ? Date.parse(facts.licenseExpiresAt) : NaN;
  if (!['active', 'trial'].includes(facts.licenseStatus ?? "") || !Number.isFinite(expiresAt) || expiresAt <= now) {
    return { allowed: false, reason: "license" };
  }
  if (!facts.roleName) return { allowed: false, reason: "role" };
  if (permissionRequired && facts.roleName !== "Administrateur" && !facts.hasPermission) {
    return { allowed: false, reason: "permission" };
  }
  return {
    allowed: true,
    tenantId: facts.tenantId,
    roleName: facts.roleName,
    platformType: facts.platformType === "HOTEL" ? "HOTEL" : "ERP",
  };
}
