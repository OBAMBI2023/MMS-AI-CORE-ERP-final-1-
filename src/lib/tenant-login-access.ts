export function profileBelongsToTenant(
  profileTenantId: string | null | undefined,
  requestedTenantId: string | null | undefined,
): boolean {
  return Boolean(
    profileTenantId &&
    requestedTenantId &&
    profileTenantId === requestedTenantId,
  );
}
