-- Revert audit_logs_user_requires_tenant, added one migration earlier
-- (20260806140000_tenant_isolate_audit_logs.sql). It rejected legitimate,
-- ongoing platform-admin audit rows: a platform administrator has a
-- profiles row (so audit_logs.user_id resolves fine) but no tenant_id of
-- their own (they are not a tenant member), and they keep producing new
-- audit_logs rows this way going forward -- not just historically. Real
-- rows observed with this shape: module IN ('super_admin_users',
-- 'super_admin_tenants', 'tenant_modules', 'hotel_modules', 'Onboarding').
--
-- Concretely: inserting a fresh audit_logs row for such an actor (user_id
-- set, profile.tenant_id NULL) violated the CHECK constraint and rejected
-- the insert outright -- confirmed while testing
-- 20260806140000_tenant_isolate_audit_logs.sql in a rolled-back
-- transaction, before this ever reached a real caller.
--
-- tenant_id NULL is therefore a permanent, legitimate state for both
-- system rows and platform-admin rows, not a transient backfill gap that a
-- constraint should eventually forbid. audit_logs_select_tenant_admin
-- (tenant_id = current_tenant_id()) already keeps those rows out of every
-- tenant-scoped admin's view; no table constraint is needed on top of it.

ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_requires_tenant;

-- ---------------------------------------------------------------------
-- ROLLBACK (re-add the constraint; NOT recommended, see rationale above):
--
-- ALTER TABLE public.audit_logs
--   ADD CONSTRAINT audit_logs_user_requires_tenant
--   CHECK (user_id IS NULL OR tenant_id IS NOT NULL) NOT VALID;
-- ---------------------------------------------------------------------
