-- Revert audit_logs_user_requires_tenant from the previous migration: it
-- rejected legitimate, ongoing platform-admin audit rows (profiles row
-- exists, but profile.tenant_id IS NULL because the actor isn't a tenant
-- member -- e.g. module IN ('super_admin_users','super_admin_tenants',
-- 'tenant_modules')). tenant_id NULL is a permanent, legitimate state for
-- those rows, not a transient backfill gap, so no such constraint can hold.
-- RLS (audit_logs_select_tenant_admin) is what keeps NULL-tenant rows out
-- of every tenant-scoped admin's view; a table constraint is not needed and
-- was actively harmful here.
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_requires_tenant;
;
