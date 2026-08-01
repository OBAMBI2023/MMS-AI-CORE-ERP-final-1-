BEGIN;
SELECT plan(16);

SELECT has_function('public', 'expire_due_subscriptions', ARRAY[]::text[]);
SELECT function_returns('public', 'expire_due_subscriptions', ARRAY[]::text[], 'integer');
SELECT is(
  (SELECT prosecdef FROM pg_proc WHERE oid = 'public.expire_due_subscriptions()'::regprocedure),
  true,
  'expiry function is SECURITY DEFINER'
);
SELECT is(
  (SELECT proconfig FROM pg_proc WHERE oid = 'public.expire_due_subscriptions()'::regprocedure),
  ARRAY['search_path=pg_catalog, public']::text[],
  'expiry function has a fixed search_path'
);
SELECT ok(NOT has_function_privilege('anon', 'public.expire_due_subscriptions()', 'EXECUTE'), 'anon cannot execute');
SELECT ok(has_function_privilege('authenticated', 'public.expire_due_subscriptions()', 'EXECUTE'), 'authenticated can reach the guarded function');
SELECT ok(has_function_privilege('service_role', 'public.expire_due_subscriptions()', 'EXECUTE'), 'service_role can execute');
SELECT ok(NOT has_table_privilege('authenticated', 'public.subscriptions', 'UPDATE'), 'authenticated cannot update subscriptions directly');
SELECT ok(has_table_privilege((SELECT proowner FROM pg_proc WHERE oid = 'public.expire_due_subscriptions()'::regprocedure), 'public.subscriptions', 'UPDATE'), 'function owner can update subscriptions');
SELECT ok(has_table_privilege((SELECT proowner FROM pg_proc WHERE oid = 'public.expire_due_subscriptions()'::regprocedure), 'public.platform_admins', 'SELECT'), 'function owner can read platform admins');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
VALUES
  ('84000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'expiry-platform-admin@example.test', '', now(), now()),
  ('84000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'expiry-tenant-user@example.test', '', now(), now());
INSERT INTO public.platform_admins (user_id) VALUES ('84000000-0000-0000-0000-000000000001');

SELECT set_config('request.jwt.claim.sub', '84000000-0000-0000-0000-000000000002', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(
  'SELECT public.expire_due_subscriptions()',
  '42501',
  'Accès refusé : super administrateur de plateforme requis.',
  'ordinary tenant user is explicitly rejected'
);
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '84000000-0000-0000-0000-000000000001', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;
SELECT lives_ok('SELECT public.expire_due_subscriptions()', 'platform admin can execute');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SET LOCAL ROLE service_role;
SELECT lives_ok('SELECT public.expire_due_subscriptions()', 'service_role can execute');
RESET ROLE;

SELECT is((SELECT count(*) FROM public.platform_admins WHERE user_id = '84000000-0000-0000-0000-000000000001'), 1::bigint, 'authorization does not delete platform admins');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.subscriptions'::regclass), 'subscriptions RLS remains enabled');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.platform_admins'::regclass), 'platform_admins RLS remains enabled');

SELECT * FROM finish();
ROLLBACK;
