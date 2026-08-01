BEGIN;
SELECT plan(28);

SELECT has_function('public','create_pending_trial_request',ARRAY['uuid','text','text','text','text','text']);
SELECT has_function('public','activate_pending_trial',ARRAY['uuid','uuid','uuid','uuid[]','text','integer','numeric']);
SELECT has_column('public','tenants','onboarding_status');
SELECT has_column('public','tenants','activity');
SELECT has_column('public','tenants','suggested_pack_code');

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_user_meta_data, email_confirmed_at, created_at, updated_at
) VALUES
  ('83000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'pending-trial-platform-admin@example.test', '',
   '{}'::jsonb, now(), now(), now()),
  ('83000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'pending-trial-admin@example.test', '',
   jsonb_build_object('full_name', 'Pending Trial Admin'), now(), now(), now()),
  ('83000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'pending-trial-ordinary@example.test', '',
   '{}'::jsonb, now(), now(), now());

INSERT INTO public.platform_admins (user_id)
VALUES ('83000000-0000-0000-0000-000000000001');

SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SELECT lives_ok(
  $$
    SELECT public.create_pending_trial_request(
      '83000000-0000-0000-0000-000000000002',
      'Pending Trial Isolation Test', 'Pending Trial Admin', 'Commerce',
      'pending-trial-admin@example.test', '+2250700000000'
    )
  $$,
  'service_role can create a pending trial request'
);

CREATE TEMP TABLE pending_trial_fixture ON COMMIT DROP AS
SELECT profile.tenant_id, clock_timestamp() AS activation_requested_at
FROM public.profiles profile
WHERE profile.id = '83000000-0000-0000-0000-000000000002';

SELECT is(
  (SELECT role_id FROM public.profiles WHERE id = '83000000-0000-0000-0000-000000000002'),
  NULL::uuid,
  'the pending profile has no assigned role'
);
SELECT is(
  (SELECT status FROM public.profiles WHERE id = '83000000-0000-0000-0000-000000000002'),
  'pending',
  'the profile remains pending before approval'
);
SELECT is(
  (SELECT tenant.onboarding_status FROM public.tenants tenant
   JOIN pending_trial_fixture fixture ON fixture.tenant_id = tenant.id),
  'pending_configuration',
  'the tenant awaits configuration before approval'
);
SELECT is(
  (SELECT tenant.is_active FROM public.tenants tenant
   JOIN pending_trial_fixture fixture ON fixture.tenant_id = tenant.id),
  false,
  'the pending tenant is inactive'
);
SELECT is(
  (SELECT count(*) FROM public.subscriptions subscription
   JOIN pending_trial_fixture fixture ON fixture.tenant_id = subscription.tenant_id),
  0::bigint,
  'the pending tenant has no subscription'
);
SELECT is(
  (SELECT count(*) FROM public.tenant_modules assignment
   JOIN pending_trial_fixture fixture ON fixture.tenant_id = assignment.tenant_id
   WHERE assignment.enabled),
  0::bigint,
  'the pending tenant has no active module assignment'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM public.roles role
    JOIN pending_trial_fixture fixture ON fixture.tenant_id = role.tenant_id
    WHERE role.name = 'Administrateur'
  ),
  'the standard role catalogue may exist without assigning a role to the pending profile'
);

INSERT INTO public.clients (name, tenant_id)
SELECT 'Pending tenant invisible client', tenant_id FROM pending_trial_fixture;

SELECT set_config('request.jwt.claim.sub', '83000000-0000-0000-0000-000000000002', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;
SELECT is(
  public.current_tenant_id(),
  NULL::uuid,
  'current_tenant_id is null for the pending profile'
);
SELECT is(
  (SELECT count(*) FROM public.clients WHERE name = 'Pending tenant invisible client'),
  0::bigint,
  'RLS hides ERP rows from the pending profile'
);
SELECT throws_ok(
  $$INSERT INTO public.clients (name) VALUES ('Forbidden pending write')$$,
  '42501',
  'new row violates row-level security policy for table "clients"',
  'RLS rejects ERP writes from the pending profile'
);
RESET ROLE;

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.activate_pending_trial(uuid,uuid,uuid,uuid[],text,integer,numeric)',
    'EXECUTE'
  ),
  'authenticated cannot execute the activation RPC'
);
SELECT throws_ok(
  format(
    'SELECT public.activate_pending_trial(%L, %L, NULL, ARRAY[]::uuid[], %L, 30, 0)',
    (SELECT tenant_id FROM pending_trial_fixture),
    '83000000-0000-0000-0000-000000000003',
    'monthly'
  ),
  'Accès refusé',
  'service_role rejects an actor who is not a platform administrator'
);

SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SELECT lives_ok(
  format(
    'SELECT public.activate_pending_trial(%L, %L, NULL, ARRAY[%L,%L]::uuid[], %L, 30, 0)',
    (SELECT tenant_id FROM pending_trial_fixture),
    '83000000-0000-0000-0000-000000000001',
    (SELECT id FROM public.erp_modules WHERE code = 'dashboard'),
    (SELECT id FROM public.erp_modules WHERE code = 'sales'),
    'monthly'
  ),
  'a platform administrator can activate the pending trial through service_role'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.profiles profile
    JOIN public.roles role ON role.id = profile.role_id
    JOIN pending_trial_fixture fixture ON fixture.tenant_id = profile.tenant_id
    WHERE profile.id = '83000000-0000-0000-0000-000000000002'
      AND role.name = 'Administrateur'
      AND role.tenant_id = fixture.tenant_id
  ),
  'activation assigns the Administrateur role owned by the correct tenant'
);
SELECT is(
  (SELECT status FROM public.profiles WHERE id = '83000000-0000-0000-0000-000000000002'),
  'active',
  'activation makes the profile active'
);
SELECT ok(
  (SELECT tenant.is_active AND tenant.onboarding_status = 'active'
   FROM public.tenants tenant
   JOIN pending_trial_fixture fixture ON fixture.tenant_id = tenant.id),
  'activation makes the tenant active and completes onboarding'
);
SELECT is(
  (SELECT array_agg(module.code ORDER BY module.code)
   FROM public.tenant_modules assignment
   JOIN public.erp_modules module ON module.id = assignment.module_id
   JOIN pending_trial_fixture fixture ON fixture.tenant_id = assignment.tenant_id
   WHERE assignment.enabled),
  ARRAY['dashboard','sales']::text[],
  'activation enables only the selected modules'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM public.subscriptions subscription
    JOIN pending_trial_fixture fixture ON fixture.tenant_id = subscription.tenant_id
    WHERE subscription.status = 'trial'
      AND subscription.trial_started_at >= fixture.activation_requested_at
      AND subscription.trial_ends_at = subscription.trial_started_at + interval '30 days'
  ),
  'activation creates the subscription at activation time with the requested duration'
);

SELECT set_config('request.jwt.claim.sub', '83000000-0000-0000-0000-000000000002', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;
SELECT is(
  public.current_tenant_id(),
  (SELECT tenant_id FROM pending_trial_fixture),
  'current_tenant_id resolves the activated tenant'
);
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SELECT throws_ok(
  format(
    'SELECT public.activate_pending_trial(%L, %L, NULL, ARRAY[]::uuid[], %L, 30, 0)',
    (SELECT tenant_id FROM pending_trial_fixture),
    '83000000-0000-0000-0000-000000000001',
    'monthly'
  ),
  'Demande pending introuvable',
  'a repeated activation is rejected once the request is no longer pending'
);
SELECT is(
  (SELECT count(*) FROM public.subscriptions subscription
   JOIN pending_trial_fixture fixture ON fixture.tenant_id = subscription.tenant_id),
  1::bigint,
  'repeated activation creates no duplicate subscription'
);
SELECT is(
  (SELECT count(*) FROM public.tenant_modules assignment
   JOIN pending_trial_fixture fixture ON fixture.tenant_id = assignment.tenant_id
   WHERE assignment.enabled),
  2::bigint,
  'repeated activation creates no duplicate module assignment'
);

SELECT * FROM finish();
ROLLBACK;
