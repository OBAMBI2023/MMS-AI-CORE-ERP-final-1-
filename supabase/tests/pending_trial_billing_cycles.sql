BEGIN;
SELECT plan(9);

SELECT is(
  enum_range(NULL::public.subscription_billing_cycle)::text,
  '{monthly,quarterly,yearly}',
  'subscription billing cycles are monthly, quarterly, and yearly'
);

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_user_meta_data, email_confirmed_at, created_at, updated_at
) VALUES
  ('84000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cycle-platform-admin@example.test', '', '{}'::jsonb, now(), now(), now()),
  ('84000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cycle-monthly@example.test', '', '{}'::jsonb, now(), now(), now()),
  ('84000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cycle-quarterly@example.test', '', '{}'::jsonb, now(), now(), now()),
  ('84000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cycle-yearly@example.test', '', '{}'::jsonb, now(), now(), now()),
  ('84000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cycle-invalid@example.test', '', '{}'::jsonb, now(), now(), now());

INSERT INTO public.platform_admins(user_id) VALUES ('84000000-0000-0000-0000-000000000001');

SELECT public.create_pending_trial_request(user_id, company_name, full_name, 'Commerce', email, '+2250700000000')
FROM (VALUES
  ('84000000-0000-0000-0000-000000000002'::uuid, 'Billing Cycle Monthly', 'Monthly Admin', 'cycle-monthly@example.test'),
  ('84000000-0000-0000-0000-000000000003'::uuid, 'Billing Cycle Quarterly', 'Quarterly Admin', 'cycle-quarterly@example.test'),
  ('84000000-0000-0000-0000-000000000004'::uuid, 'Billing Cycle Yearly', 'Yearly Admin', 'cycle-yearly@example.test'),
  ('84000000-0000-0000-0000-000000000005'::uuid, 'Billing Cycle Invalid', 'Invalid Admin', 'cycle-invalid@example.test')
) AS fixture(user_id, company_name, full_name, email);

SELECT lives_ok(
  format('SELECT public.activate_pending_trial(%L, %L, NULL, ARRAY[]::uuid[], %L, 30, 0)', profile.tenant_id, '84000000-0000-0000-0000-000000000001', cycle),
  format('activation accepts the %s billing cycle', cycle)
)
FROM (VALUES
  ('84000000-0000-0000-0000-000000000002'::uuid, 'monthly'),
  ('84000000-0000-0000-0000-000000000003'::uuid, 'quarterly'),
  ('84000000-0000-0000-0000-000000000004'::uuid, 'yearly')
) AS expected(user_id, cycle)
JOIN public.profiles profile ON profile.id = expected.user_id;

SELECT is(subscription.billing_cycle::text, expected.cycle, format('activation stores the %s enum value', expected.cycle))
FROM (VALUES
  ('84000000-0000-0000-0000-000000000002'::uuid, 'monthly'),
  ('84000000-0000-0000-0000-000000000003'::uuid, 'quarterly'),
  ('84000000-0000-0000-0000-000000000004'::uuid, 'yearly')
) AS expected(user_id, cycle)
JOIN public.profiles profile ON profile.id = expected.user_id
JOIN public.subscriptions subscription ON subscription.tenant_id = profile.tenant_id;

SELECT throws_ok(
  format(
    'SELECT public.activate_pending_trial(%L, %L, NULL, ARRAY[]::uuid[], %L, 30, 0)',
    profile.tenant_id, '84000000-0000-0000-0000-000000000001', 'weekly'
  ),
  '22023',
  'Cycle de facturation inconnu: ''weekly''. Valeurs autorisées: monthly, quarterly, yearly',
  'activation rejects an unknown billing cycle with a clear message'
)
FROM public.profiles profile WHERE profile.id = '84000000-0000-0000-0000-000000000005';

SELECT ok(
  NOT tenant.is_active AND tenant.onboarding_status = 'pending_configuration'
    AND profile.status = 'pending' AND subscription.id IS NULL,
  'a rejected billing cycle leaves the activation transaction untouched'
)
FROM public.profiles profile
JOIN public.tenants tenant ON tenant.id = profile.tenant_id
LEFT JOIN public.subscriptions subscription ON subscription.tenant_id = tenant.id
WHERE profile.id = '84000000-0000-0000-0000-000000000005';

SELECT * FROM finish();
ROLLBACK;
