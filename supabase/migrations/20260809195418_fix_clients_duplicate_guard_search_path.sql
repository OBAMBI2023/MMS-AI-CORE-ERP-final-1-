CREATE OR REPLACE FUNCTION public.normalize_client_email(p_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(lower(btrim(p_email)), '');
$$;

CREATE OR REPLACE FUNCTION public.normalize_client_phone(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(regexp_replace(btrim(p_phone), '[[:space:]()-]', '', 'g'), '');
$$;

CREATE OR REPLACE FUNCTION public.check_client_duplicate(
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
;
