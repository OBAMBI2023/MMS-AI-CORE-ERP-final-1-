-- Anti-duplicate guard for clients, scoped per tenant.
-- Email is normalized as lowercase + trim; phone is normalized by stripping
-- spaces, hyphens and parentheses. Raw stored values are left untouched --
-- normalization only affects comparison. Existing duplicate data is never
-- deleted automatically.

CREATE OR REPLACE FUNCTION public.normalize_client_email(p_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(lower(btrim(p_email)), '');
$$;

CREATE OR REPLACE FUNCTION public.normalize_client_phone(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(regexp_replace(btrim(p_phone), '[[:space:]()-]', '', 'g'), '');
$$;

-- Best-effort unique indexes, per tenant. If pre-existing duplicate data
-- would violate them, creation is skipped (with a NOTICE) instead of
-- failing the whole migration. Duplicates are reported, never deleted.
DO $$
BEGIN
  CREATE UNIQUE INDEX clients_tenant_email_key
    ON public.clients (tenant_id, public.normalize_client_email(email))
    WHERE tenant_id IS NOT NULL AND public.normalize_client_email(email) IS NOT NULL;
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'clients_tenant_email_key skipped: pre-existing duplicate emails found within a tenant. Resolve manually, then run: CREATE UNIQUE INDEX clients_tenant_email_key ON public.clients (tenant_id, public.normalize_client_email(email)) WHERE tenant_id IS NOT NULL AND public.normalize_client_email(email) IS NOT NULL;';
END $$;

DO $$
BEGIN
  CREATE UNIQUE INDEX clients_tenant_phone_key
    ON public.clients (tenant_id, public.normalize_client_phone(phone))
    WHERE tenant_id IS NOT NULL AND public.normalize_client_phone(phone) IS NOT NULL;
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'clients_tenant_phone_key skipped: pre-existing duplicate phones found within a tenant. Resolve manually, then run: CREATE UNIQUE INDEX clients_tenant_phone_key ON public.clients (tenant_id, public.normalize_client_phone(phone)) WHERE tenant_id IS NOT NULL AND public.normalize_client_phone(phone) IS NOT NULL;';
END $$;

-- App-facing duplicate check. Runs as SECURITY INVOKER (default) so the
-- existing "tenant isolation clients" RLS policy applies to the lookup --
-- it can never see another tenant's rows even if p_tenant_id is spoofed.
CREATE OR REPLACE FUNCTION public.check_client_duplicate(
  p_tenant_id uuid,
  p_email text,
  p_phone text,
  p_exclude_id uuid DEFAULT NULL
)
RETURNS TABLE(duplicate_email boolean, duplicate_phone boolean)
LANGUAGE sql
STABLE
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.tenant_id = p_tenant_id
        AND (p_exclude_id IS NULL OR c.id <> p_exclude_id)
        AND public.normalize_client_email(c.email) IS NOT NULL
        AND public.normalize_client_email(c.email) = public.normalize_client_email(p_email)
    ) AS duplicate_email,
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.tenant_id = p_tenant_id
        AND (p_exclude_id IS NULL OR c.id <> p_exclude_id)
        AND public.normalize_client_phone(c.phone) IS NOT NULL
        AND public.normalize_client_phone(c.phone) = public.normalize_client_phone(p_phone)
    ) AS duplicate_phone;
$$;

GRANT EXECUTE ON FUNCTION public.check_client_duplicate(uuid, text, text, uuid) TO authenticated;
;
