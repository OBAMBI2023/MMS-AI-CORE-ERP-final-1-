export const TENANT_CACHE_CLEARING_AUTH_EVENTS = new Set(["SIGNED_OUT", "USER_UPDATED"]);

export function shouldClearTenantScopedCache(event: string): boolean {
  return TENANT_CACHE_CLEARING_AUTH_EVENTS.has(event);
}
