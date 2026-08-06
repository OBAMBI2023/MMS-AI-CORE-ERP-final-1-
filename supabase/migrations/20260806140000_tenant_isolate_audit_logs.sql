-- Tenant-isolate public.audit_logs.
--
-- Problem: audit_logs had no tenant_id column, and its only RLS policy
-- ("Admins_read_audit_logs", FOR SELECT USING (public.is_admin())) let any
-- tenant's administrator read every tenant's audit trail. is_admin() only
-- checks whether the caller is an admin of their own tenant -- it says
-- nothing about which rows belong to that tenant, so no row was actually
-- filtered by tenant.
--
-- Fix, in order:
--   1. Add a nullable tenant_id uuid column + FK to public.tenants + index.
--      Nullable is required: some legitimate rows (system actions, rows
--      whose user was later deleted) can never carry a certain tenant_id,
--      and requirement (2) below forbids guessing one or deleting them.
--   2. Backfill tenant_id from profiles.tenant_id via audit_logs.user_id,
--      for rows where that profile can be resolved with certainty. Rows
--      that can't be attributed (system rows, deleted users, profiles with
--      no tenant of their own) are reported via RAISE NOTICE and left with
--      tenant_id NULL -- never deleted, never guessed.
--   3. A NOT VALID CHECK constraint enforces, for all NEW rows going
--      forward, that any row tied to a real user_id must carry a
--      tenant_id. Pre-existing violators from step 2 are grandfathered in
--      (NOT VALID skips the historical scan) so the migration itself never
--      fails because of legacy orphans.
--      NOTE: this constraint was reverted one migration later
--      (20260806220000_drop_audit_logs_user_requires_tenant_check.sql) --
--      see that file for why. Left intact here, unmodified, because this
--      migration was already applied as-is; never edit an applied
--      migration in this repo, add a correcting one instead.
--   4. A BEFORE INSERT/UPDATE-OF-user_id trigger derives tenant_id from
--      public.profiles server-side and overwrites whatever the caller
--      supplied, so application code can never hand this table an
--      arbitrary tenant_id for a row tied to a real user. For system rows
--      (user_id IS NULL) the trigger does nothing: trusted server code may
--      set tenant_id explicitly when a system action is known to belong to
--      one tenant; if it doesn't, the row keeps tenant_id = NULL, i.e. it
--      is platform-level and stays invisible to every tenant admin. That is
--      the explicit system-action strategy this migration adopts.
--   5. Admins_read_audit_logs is replaced by a policy that additionally
--      requires tenant_id = current_tenant_id(). No INSERT/UPDATE/DELETE
--      policy is added for authenticated/anon: RLS is enabled with no such
--      policy for those commands, so PostgREST already denies them for
--      every role that doesn't bypass RLS. Audit logs stay immutable from
--      the client; only this project's existing service-role server code
--      (already used for every audit_logs write today) can write here.
--
-- This migration is additive and non-destructive (no rows are removed, no
-- column is dropped). See the commented ROLLBACK block at the end of this
-- file for how to revert it manually if ever needed.

-- 1. Column, FK, index --------------------------------------------------

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);

-- 2. Backfill from the actor's profile -----------------------------------

UPDATE public.audit_logs log
SET tenant_id = profile.tenant_id
FROM public.profiles profile
WHERE profile.id = log.user_id
  AND log.tenant_id IS NULL
  AND profile.tenant_id IS NOT NULL;

DO $$
DECLARE
  system_rows bigint;
  deleted_user_rows bigint;
  tenantless_profile_rows bigint;
BEGIN
  SELECT count(*) INTO system_rows
  FROM public.audit_logs
  WHERE tenant_id IS NULL AND user_id IS NULL;

  SELECT count(*) INTO deleted_user_rows
  FROM public.audit_logs log
  WHERE log.tenant_id IS NULL
    AND log.user_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = log.user_id);

  SELECT count(*) INTO tenantless_profile_rows
  FROM public.audit_logs log
  JOIN public.profiles profile ON profile.id = log.user_id
  WHERE log.tenant_id IS NULL
    AND profile.tenant_id IS NULL;

  RAISE NOTICE 'audit_logs tenant backfill: % system row(s) (user_id IS NULL), % row(s) with a deleted user, % row(s) whose profile has no tenant of its own -- all left unattributed (tenant_id NULL), none deleted.',
    system_rows, deleted_user_rows, tenantless_profile_rows;
END
$$;

-- 3. Forward-looking guard rail -------------------------------------------
-- NOT VALID: enforced for every new INSERT/UPDATE from now on, but does not
-- scan (and therefore cannot fail on) the legacy orphaned rows from step 2.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.audit_logs'::regclass
      AND conname = 'audit_logs_user_requires_tenant'
      AND contype = 'c'
  ) THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT audit_logs_user_requires_tenant
      CHECK (user_id IS NULL OR tenant_id IS NOT NULL) NOT VALID;
  END IF;
END
$$;

-- 4. Server-derived tenant_id, never client-supplied ----------------------

CREATE OR REPLACE FUNCTION public.set_audit_log_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    -- Always overwrite with the profile's own tenant_id, ignoring anything
    -- the caller supplied. NULL when the profile is missing or tenant-less
    -- (deleted user / platform admin acting through user_id) -- never
    -- guessed.
    SELECT profile.tenant_id INTO NEW.tenant_id
    FROM public.profiles profile
    WHERE profile.id = NEW.user_id;
  END IF;
  -- user_id IS NULL (system action): tenant_id is left exactly as supplied
  -- by trusted server code (explicit tenant attribution for a tenant-scoped
  -- system action, or NULL for a platform-level one). Not overwritten here.
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_audit_log_tenant() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_audit_logs_set_tenant ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_set_tenant
  BEFORE INSERT OR UPDATE OF user_id ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_log_tenant();

-- 5. RLS: tenant-scoped SELECT, no client write path -----------------------

DROP POLICY IF EXISTS "Admins_read_audit_logs" ON public.audit_logs;
CREATE POLICY "audit_logs_select_tenant_admin" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin() AND tenant_id = public.current_tenant_id());

-- Deliberately no INSERT/UPDATE/DELETE policy for authenticated/anon:
-- RLS is enabled on this table and no policy grants those commands to those
-- roles, so PostgREST denies them outright. Only the service-role server
-- code this project already uses for every audit_logs write can write here.

-- ---------------------------------------------------------------------
-- ROLLBACK (run manually if this migration must be reverted; run this
-- AFTER rolling back 20260806220000_drop_audit_logs_user_requires_tenant_check.sql
-- if that migration has also been applied):
--
-- DROP TRIGGER IF EXISTS trg_audit_logs_set_tenant ON public.audit_logs;
-- DROP FUNCTION IF EXISTS public.set_audit_log_tenant();
-- ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_requires_tenant;
-- DROP POLICY IF EXISTS "audit_logs_select_tenant_admin" ON public.audit_logs;
-- CREATE POLICY "Admins_read_audit_logs" ON public.audit_logs FOR SELECT USING (public.is_admin());
-- DROP INDEX IF EXISTS idx_audit_logs_tenant_id;
-- ALTER TABLE public.audit_logs DROP COLUMN IF EXISTS tenant_id;
-- ---------------------------------------------------------------------
