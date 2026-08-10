/**
 * Central per-tenant-type eligibility rules for erp_modules.
 *
 * Every `hotel_*`-coded module (hotel_dashboard, hotel_maintenance i.e.
 * "Prestataires", hotel_reservations, etc.) only makes sense for HOTEL
 * tenants — this mirrors the platform_type = 'HOTEL' check already baked
 * into hotel_module_enabled()/hotel_permission_for() server-side. Everything
 * else (including "support") is available to every tenant type.
 *
 * Consumed by the Super Admin module-management console (which modules to
 * show as eligible/toggleable for a selected tenant) and as a server-side
 * defense-in-depth guard before enabling a module for a tenant.
 */
export function isModuleEligibleForTenant(
  moduleCode: string,
  platformType: string | null | undefined,
): boolean {
  if (moduleCode.startsWith("hotel_")) return platformType === "HOTEL";
  return true;
}
