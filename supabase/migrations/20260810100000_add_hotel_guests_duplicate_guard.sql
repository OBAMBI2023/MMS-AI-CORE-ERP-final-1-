-- Anti-duplicate guard for hotel_guests (module HOTEL, table used by
-- /hotel/clients), scoped per tenant. Mirrors the clients/fournisseurs
-- duplicate guards (see add_clients_duplicate_guard and
-- add_fournisseurs_duplicate_guard): reuses the existing
-- normalize_client_email / normalize_client_phone helpers, whose logic
-- (lowercase+trim for email; strip spaces/hyphens/parens for phone) is
-- generic, not clients-specific. Raw stored values are left untouched —
-- normalization only affects comparison. Existing duplicate data is never
-- deleted automatically.

-- Best-effort unique indexes, per tenant. If pre-existing duplicate data
-- would violate them, creation is skipped (with a NOTICE) instead of
-- failing the whole migration. Duplicates are reported, never deleted.
DO $$
BEGIN
  CREATE UNIQUE INDEX hotel_guests_tenant_email_key
    ON public.hotel_guests (tenant_id, public.normalize_client_email(email))
    WHERE tenant_id IS NOT NULL AND public.normalize_client_email(email) IS NOT NULL;
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'hotel_guests_tenant_email_key skipped: pre-existing duplicate emails found within a tenant. Resolve manually, then run: CREATE UNIQUE INDEX hotel_guests_tenant_email_key ON public.hotel_guests (tenant_id, public.normalize_client_email(email)) WHERE tenant_id IS NOT NULL AND public.normalize_client_email(email) IS NOT NULL;';
END $$;

DO $$
BEGIN
  CREATE UNIQUE INDEX hotel_guests_tenant_phone_key
    ON public.hotel_guests (tenant_id, public.normalize_client_phone(phone))
    WHERE tenant_id IS NOT NULL AND public.normalize_client_phone(phone) IS NOT NULL;
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'hotel_guests_tenant_phone_key skipped: pre-existing duplicate phones found within a tenant. Resolve manually, then run: CREATE UNIQUE INDEX hotel_guests_tenant_phone_key ON public.hotel_guests (tenant_id, public.normalize_client_phone(phone)) WHERE tenant_id IS NOT NULL AND public.normalize_client_phone(phone) IS NOT NULL;';
END $$;

-- App-facing duplicate check. Runs as SECURITY INVOKER (default) so the
-- existing "hotel_select_permission" RLS policy applies to the lookup — it
-- can never see another tenant's rows even if p_tenant_id is spoofed.
CREATE OR REPLACE FUNCTION public.check_hotel_guest_duplicate(
  p_tenant_id uuid,
  p_email text,
  p_phone text,
  p_exclude_id uuid DEFAULT NULL
)
RETURNS TABLE(duplicate_email boolean, duplicate_phone boolean)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.hotel_guests g
      WHERE g.tenant_id = p_tenant_id
        AND (p_exclude_id IS NULL OR g.id <> p_exclude_id)
        AND public.normalize_client_email(g.email) IS NOT NULL
        AND public.normalize_client_email(g.email) = public.normalize_client_email(p_email)
    ) AS duplicate_email,
    EXISTS (
      SELECT 1 FROM public.hotel_guests g
      WHERE g.tenant_id = p_tenant_id
        AND (p_exclude_id IS NULL OR g.id <> p_exclude_id)
        AND public.normalize_client_phone(g.phone) IS NOT NULL
        AND public.normalize_client_phone(g.phone) = public.normalize_client_phone(p_phone)
    ) AS duplicate_phone;
$$;

GRANT EXECUTE ON FUNCTION public.check_hotel_guest_duplicate(uuid, text, text, uuid) TO authenticated;
