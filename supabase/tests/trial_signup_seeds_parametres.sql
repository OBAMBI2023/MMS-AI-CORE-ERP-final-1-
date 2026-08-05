-- Run after migrations. Regression test for the "Paramètres introuvables"
-- bug: create_trial_workspace must seed a public.parametres row for the
-- tenant it creates, in the same transaction, so /parametres works on first
-- visit. Any failed assertion aborts the transaction.
BEGIN;
SELECT plan(4);

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
) VALUES (
  '90000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'trial-parametres@example.test', '',
  now(), now(), now()
);

DO $$
DECLARE
  signup_result jsonb;
BEGIN
  signup_result := public.create_trial_workspace(
    '90000000-0000-0000-0000-000000000004',
    'Boutique Parametres Test',
    'Awa Diallo',
    'trial-parametres@example.test',
    '+225070000004',
    'commerce'
  );
  PERFORM set_config('trial_signup_test.parametres_tenant_id', signup_result ->> 'tenantId', true);
END;
$$;

-- --- a parametres row exists immediately for the new tenant ---
SELECT is(
  (SELECT count(*) FROM public.parametres
   WHERE tenant_id = current_setting('trial_signup_test.parametres_tenant_id')::uuid),
  1::bigint,
  'exactly one parametres row is created for the new trial tenant'
);

-- --- it carries the tenant's own company name, not the legacy placeholder ---
SELECT is(
  (SELECT company_name FROM public.parametres
   WHERE tenant_id = current_setting('trial_signup_test.parametres_tenant_id')::uuid),
  'Boutique Parametres Test',
  'the seeded row uses the trial company name'
);

-- --- other columns keep their table defaults ---
SELECT is(
  (SELECT currency FROM public.parametres
   WHERE tenant_id = current_setting('trial_signup_test.parametres_tenant_id')::uuid),
  'FCFA',
  'the seeded row keeps the default currency'
);

-- --- re-running the insert path (ON CONFLICT DO NOTHING) never duplicates ---
SELECT throws_ok(
  format(
    $$INSERT INTO public.parametres (tenant_id, company_name) VALUES (%L, %L)$$,
    current_setting('trial_signup_test.parametres_tenant_id')::uuid,
    'Duplicate Attempt'
  ),
  'duplicate key value violates unique constraint "parametres_tenant_id_uq"',
  'a second unprotected insert for the same tenant_id is rejected by the unique constraint'
);

SELECT * FROM finish();
ROLLBACK;
