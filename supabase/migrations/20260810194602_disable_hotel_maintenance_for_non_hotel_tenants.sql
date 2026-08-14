-- Corrects leftover tenant_modules rows from the now-fixed commerce_generale
-- pack misconfiguration (20260810170000_...): hotel_maintenance ("Prestataires")
-- must only be enabled for platform_type='HOTEL' tenants. Real data access
-- was never actually exposed (hotel_permission_for() independently checks
-- platform_type), and the Super Admin console already hides this module for
-- non-hotel tenants regardless of tenant_modules state — this closes the
-- underlying data inconsistency so tenant_modules stays a trustworthy single
-- source of truth. Disables rather than deletes, to preserve history.
UPDATE public.tenant_modules
SET enabled = false, updated_at = now()
WHERE module_id = (SELECT id FROM public.erp_modules WHERE code = 'hotel_maintenance')
  AND enabled = true
  AND tenant_id IN (
    SELECT id FROM public.tenants WHERE platform_type IS DISTINCT FROM 'HOTEL' AND deleted_at IS NULL
  );
;
