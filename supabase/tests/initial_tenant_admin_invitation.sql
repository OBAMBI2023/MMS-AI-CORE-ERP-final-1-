BEGIN;
SELECT plan(13);

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_user_meta_data, email_confirmed_at, created_at, updated_at
) VALUES
  ('81000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'platform-admin-invitation@example.test', '',
   '{}'::jsonb, now(), now(), now()),
  ('81000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'initial-admin-invitation@example.test', '',
   jsonb_build_object('full_name', 'Initial Admin'), NULL, now(), now()),
  ('81000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ordinary-invitation@example.test', '',
   '{}'::jsonb, now(), now(), now());

SELECT is(
  (SELECT role_id FROM public.profiles WHERE id = '81000000-0000-0000-0000-000000000002'),
  NULL::uuid,
  'an Auth invitation creates a role-less profile before tenant onboarding'
);
SELECT is(
  (SELECT tenant_id FROM public.profiles WHERE id = '81000000-0000-0000-0000-000000000002'),
  NULL::uuid,
  'an Auth invitation creates a tenant-less profile before tenant onboarding'
);

INSERT INTO public.platform_admins (user_id)
VALUES ('81000000-0000-0000-0000-000000000001');

SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SELECT lives_ok(
  $$
    SELECT public.create_tenant_by_super_admin_invitation(
      'Invitation Tenant Test',
      'initial-admin-invitation@example.test',
      '81000000-0000-0000-0000-000000000002',
      '81000000-0000-0000-0000-000000000001',
      'monthly', 30, ARRAY[]::uuid[]
    )
  $$,
  'the controlled server flow may create the initial tenant administrator'
);
SELECT is(
  (SELECT role.name
   FROM public.profiles profile
   JOIN public.roles role ON role.id = profile.role_id
   WHERE profile.id = '81000000-0000-0000-0000-000000000002'),
  'Administrateur',
  'the invited initial user receives the tenant Administrateur role'
);
SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.profiles profile
    JOIN public.roles role ON role.id = profile.role_id
    WHERE profile.id = '81000000-0000-0000-0000-000000000002'
      AND profile.tenant_id = role.tenant_id
  ),
  'the initial administrator role belongs to the same tenant as the profile'
);

INSERT INTO public.tenants (id, name, slug)
VALUES
  ('82000000-0000-0000-0000-000000000001', 'Security Tenant A', 'security-tenant-a'),
  ('82000000-0000-0000-0000-000000000002', 'Security Tenant B', 'security-tenant-b');

SELECT throws_ok(
  $$
    UPDATE public.profiles
    SET tenant_id = '82000000-0000-0000-0000-000000000001',
        role_id = gen_random_uuid()
    WHERE id = '81000000-0000-0000-0000-000000000003'
  $$,
  '23514', 'Attribution de rôle refusée',
  'an arbitrary role assignment is rejected'
);

SELECT throws_ok(
  $$
    UPDATE public.profiles
    SET tenant_id = '82000000-0000-0000-0000-000000000001',
        role_id = (
          SELECT id FROM public.roles
          WHERE tenant_id = '82000000-0000-0000-0000-000000000002'
            AND name = 'Administrateur'
        )
    WHERE id = '81000000-0000-0000-0000-000000000003'
  $$,
  '23514', 'Attribution de rôle refusée',
  'a cross-tenant role assignment is rejected'
);

SELECT set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000003', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$
    UPDATE public.profiles
    SET tenant_id = '82000000-0000-0000-0000-000000000001',
        role_id = (
          SELECT id FROM public.roles
          WHERE tenant_id = '82000000-0000-0000-0000-000000000001'
            AND name = 'Administrateur'
        )
    WHERE id = '81000000-0000-0000-0000-000000000003'
  $$,
  '42501',
  'permission denied for table profiles',
  'an ordinary authenticated user cannot update protected profile columns'
);
RESET ROLE;

SELECT is(
  (SELECT role_id FROM public.profiles WHERE id = '81000000-0000-0000-0000-000000000003'),
  NULL::uuid,
  'the ordinary user remains role-less after the rejected escalation'
);
SELECT is(
  (SELECT tenant_id FROM public.profiles WHERE id = '81000000-0000-0000-0000-000000000003'),
  NULL::uuid,
  'the ordinary user remains tenant-less after the rejected escalation'
);
SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.create_tenant_by_super_admin_invitation(text,text,uuid,uuid,public.subscription_billing_cycle,integer,uuid[])',
    'EXECUTE'
  ),
  'authenticated cannot execute the initial-admin onboarding RPC'
);
SELECT ok(
  has_function_privilege(
    'service_role',
    'public.create_tenant_by_super_admin_invitation(text,text,uuid,uuid,public.subscription_billing_cycle,integer,uuid[])',
    'EXECUTE'
  ),
  'service_role can execute the guarded initial-admin onboarding RPC'
);

SELECT throws_ok(
  $$
    SELECT public.create_tenant_by_super_admin_invitation(
      'Forbidden Ordinary Actor Tenant',
      'ordinary-invitation@example.test',
      '81000000-0000-0000-0000-000000000003',
      '81000000-0000-0000-0000-000000000003',
      'monthly', 30, ARRAY[]::uuid[]
    )
  $$,
  '42501', 'Accès refusé',
  'service_role still rejects an actor who is not a platform administrator'
);

SELECT * FROM finish();
ROLLBACK;
