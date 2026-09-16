-- Enables the anonymous public hotel directory vitrine (/hotel-vitrine,
-- /hotel-vitrine/hotels, /hotel-vitrine/hotels/:slug) to read a strictly
-- limited, opt-in slice of `tenants` and `hotel_room_types`.
--
-- Nothing else changes: no other table gets an anon policy here, and the
-- existing `authenticated` policies/grants on `tenants` and
-- `hotel_room_types` are untouched. Guests, reservations, invoices,
-- profiles, permissions and identity documents live in entirely separate
-- tables that this migration never references or grants.

-- 1. Publication flag. Defaults to false: a tenant is never public unless a
--    tenant admin explicitly opts in (future back-office toggle, out of
--    scope here). Being HOTEL + active + not deleted/suspended is NOT
--    sufficient on its own for public visibility.
ALTER TABLE public.tenants
  ADD COLUMN is_public boolean NOT NULL DEFAULT false;

-- 2. `anon` already held a blanket table-level SELECT grant on `tenants`
--    (pre-existing, likely a default-schema leftover never exercised
--    because no anon RLS policy existed). Replace it with a column-level
--    grant limited to what the public vitrine needs, plus the columns the
--    policy predicate below must evaluate. Internal/administrative columns
--    (deletion_reason, suspension_reason, onboarding_status, activity,
--    suggested_pack_code, signup_activity, activity_profile_code, *_by)
--    are deliberately excluded. INSERT/UPDATE/DELETE grants on `tenants`
--    for `anon` are left as-is (unrelated to this feature; RLS still blocks
--    all of them since no anon policy exists for those commands).
REVOKE SELECT ON public.tenants FROM anon;
GRANT SELECT (
  id, slug, name, city, address, phone, email, logo_url, business_sector,
  platform_type, is_active, is_public, deleted_at, suspended_at
) ON public.tenants TO anon;

CREATE POLICY tenants_public_hotel_read ON public.tenants
  FOR SELECT
  TO anon
  USING (
    platform_type = 'HOTEL'
    AND is_active = true
    AND deleted_at IS NULL
    AND suspended_at IS NULL
    AND is_public = true
  );

-- 3. hotel_room_types: no `is_public` column of its own -- publicity is
--    inherited from the parent tenant via the same criteria. `anon` had no
--    grant at all on this table before; add only the columns the vitrine
--    displays (room category name, capacity, indicative nightly rate,
--    amenities). No pricing history, no live availability, no individual
--    room numbers/status (those stay on `hotel_rooms`, never granted here).
GRANT SELECT (id, tenant_id, name, capacity, base_rate, amenities)
  ON public.hotel_room_types TO anon;

CREATE POLICY hotel_room_types_public_read ON public.hotel_room_types
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = hotel_room_types.tenant_id
        AND t.platform_type = 'HOTEL'
        AND t.is_active = true
        AND t.deleted_at IS NULL
        AND t.suspended_at IS NULL
        AND t.is_public = true
    )
  );
