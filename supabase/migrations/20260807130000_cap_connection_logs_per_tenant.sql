-- Cap public.connection_logs at the 10 most recent rows per tenant.
--
-- Context: 20260722120000_add_connection_logs.sql created connection_logs
-- with no tenant_id, no cap, and stored both successes and failures. This
-- migration brings the committed schema in line with what the feature
-- actually needs (a per-tenant "last 10 logins" list for
-- Paramètres > Journal d'audit > Dernières connexions):
--
--   1. tenant_id (+ device/browser/user_agent/is_suspicious columns for the
--      security-review side of this table) so rows can be scoped and
--      queried per tenant.
--   2. Only successful, attributable logins are kept -- failures and rows
--      with no resolvable user/tenant are dropped; they were never part of
--      the "last 10 logins" requirement and can't be tenant-scoped anyway.
--   3. tenant_id/user_id become NOT NULL once the data satisfies that.
--   4. RLS: tenant admins see only their own tenant's rows; platform
--      security actors holding the connections.view permission may review
--      any tenant's rows (existing platform security-review capability).
--   5. log_connection_attempt() is replaced so that, inside the same
--      transaction as the insert, it deletes every row for that tenant
--      beyond the 10 most recent (created_at DESC, id DESC tie-break). An
--      advisory lock keyed on the tenant serializes concurrent logins for
--      that tenant so the cap stays exact under concurrency. Never touches
--      another tenant's rows: every delete is scoped to actor_tenant_id.
--
-- Additive/idempotent: safe to run against a database that already has
-- some or all of this (ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE,
-- DROP POLICY IF EXISTS + CREATE POLICY, guarded constraint add).

-- 1. Columns ----------------------------------------------------------------

ALTER TABLE public.connection_logs
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS browser text,
  ADD COLUMN IF NOT EXISTS device text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS is_suspicious boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspicious_marked_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspicious_marked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Drop rows that predate tenant-scoped history -----------------------
-- Failed attempts and rows with no user were never part of the "last 10
-- logins per tenant" list and cannot be attributed to a tenant.

DELETE FROM public.connection_logs WHERE status <> 'success' OR user_id IS NULL;

UPDATE public.connection_logs log
SET tenant_id = profile.tenant_id
FROM public.profiles profile
WHERE profile.id = log.user_id
  AND log.tenant_id IS NULL
  AND profile.tenant_id IS NOT NULL;

-- A row whose profile is gone or tenant-less can't be attributed either.
DELETE FROM public.connection_logs WHERE tenant_id IS NULL;

-- 3. Enforce the invariants now that all remaining data satisfies them ------

ALTER TABLE public.connection_logs
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN tenant_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.connection_logs'::regclass
      AND conname = 'connection_logs_status_check'
  ) THEN
    ALTER TABLE public.connection_logs
      ADD CONSTRAINT connection_logs_status_check CHECK (status = 'success');
  END IF;
END
$$;

-- Every read of this table is "latest N rows for one tenant".
CREATE INDEX IF NOT EXISTS idx_connection_logs_tenant_created_at
  ON public.connection_logs (tenant_id, created_at DESC);

-- 4. RLS ---------------------------------------------------------------

DROP POLICY IF EXISTS "Admins can view logs" ON public.connection_logs;

DROP POLICY IF EXISTS "Tenant admins can view connection logs" ON public.connection_logs;
CREATE POLICY "Tenant admins can view connection logs" ON public.connection_logs
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_admin());

DROP POLICY IF EXISTS "Security actors read all connection logs" ON public.connection_logs;
CREATE POLICY "Security actors read all connection logs" ON public.connection_logs
  FOR SELECT TO authenticated
  USING (public.has_connection_security_permission('connections.view'));

-- Deliberately no INSERT/UPDATE/DELETE policy for authenticated/anon: RLS
-- is enabled with no such policy for those commands, so PostgREST denies
-- them outright. Writes only happen through the SECURITY DEFINER RPC below.

-- 5. Insert + enforce the 10-per-tenant cap in the same transaction --------

CREATE OR REPLACE FUNCTION public.log_connection_attempt(
  p_email text,
  p_status text,
  p_user_id uuid DEFAULT NULL,
  p_device text DEFAULT NULL,
  p_browser text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  actor_tenant_id uuid;
BEGIN
  -- Authentication failures and non-login activity are deliberately ignored.
  IF p_status <> 'success' OR p_user_id IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN;
  END IF;

  SELECT tenant_id INTO actor_tenant_id
  FROM public.profiles
  WHERE id = auth.uid();

  -- Platform/partner identities do not belong to a tenant connection history.
  IF actor_tenant_id IS NULL THEN
    RETURN;
  END IF;

  -- Serialize simultaneous logins for the same tenant so the cap remains exact.
  PERFORM pg_advisory_xact_lock(hashtextextended(actor_tenant_id::text, 0));

  INSERT INTO public.connection_logs (
    user_id, tenant_id, email, status, device, browser, user_agent
  ) VALUES (
    auth.uid(), actor_tenant_id, p_email, 'success',
    NULLIF(left(p_device, 100), ''),
    NULLIF(left(p_browser, 100), ''),
    NULLIF(left(p_user_agent, 1000), '')
  );

  DELETE FROM public.connection_logs old_log
  WHERE old_log.tenant_id = actor_tenant_id
    AND old_log.id NOT IN (
      SELECT kept.id
      FROM public.connection_logs kept
      WHERE kept.tenant_id = actor_tenant_id
      ORDER BY kept.created_at DESC, kept.id DESC
      LIMIT 10
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.log_connection_attempt(text, text, uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_connection_attempt(text, text, uuid, text, text, text) TO authenticated;

-- ---------------------------------------------------------------------
-- ROLLBACK (manual, if this migration must be reverted):
--
-- DROP POLICY IF EXISTS "Security actors read all connection logs" ON public.connection_logs;
-- DROP POLICY IF EXISTS "Tenant admins can view connection logs" ON public.connection_logs;
-- CREATE POLICY "Admins can view logs" ON public.connection_logs FOR SELECT USING (
--   EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_app_meta_data->>'role' = 'admin')
-- );
-- ALTER TABLE public.connection_logs ALTER COLUMN tenant_id DROP NOT NULL;
-- ALTER TABLE public.connection_logs ALTER COLUMN user_id DROP NOT NULL;
-- ALTER TABLE public.connection_logs DROP CONSTRAINT IF EXISTS connection_logs_status_check;
-- DROP INDEX IF EXISTS idx_connection_logs_tenant_created_at;
-- CREATE OR REPLACE FUNCTION public.log_connection_attempt(p_email text, p_status text, p_user_id uuid DEFAULT NULL)
--   RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
--   BEGIN INSERT INTO connection_logs (email, status, user_id) VALUES (p_email, p_status, p_user_id); END; $$;
-- ---------------------------------------------------------------------
