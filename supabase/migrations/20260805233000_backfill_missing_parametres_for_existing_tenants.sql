-- One-time data backfill, not a schema change. 20260805230000 stopped
-- create_trial_workspace from producing new tenants without a
-- public.parametres row, but every tenant created before that fix (via the
-- trial flow or any other onboarding path) was already missing one, so
-- /parametres still shows "Paramètres introuvables." for them.
--
-- Seeds one parametres row per active tenant that has none, using the
-- tenant's own name as company_name (same choice as the forward-fix) and
-- leaving every other column on its table default. Soft-deleted tenants
-- (deleted_at IS NOT NULL) are intentionally skipped — there is no
-- /parametres page left to fix for them.
--
-- ON CONFLICT (tenant_id) DO NOTHING keeps this idempotent and safe to
-- re-run: it can never touch a tenant that already has a row.
INSERT INTO public.parametres (tenant_id, company_name)
SELECT t.id, t.name
FROM public.tenants t
LEFT JOIN public.parametres p ON p.tenant_id = t.id
WHERE p.id IS NULL
  AND t.deleted_at IS NULL
ON CONFLICT (tenant_id) DO NOTHING;
