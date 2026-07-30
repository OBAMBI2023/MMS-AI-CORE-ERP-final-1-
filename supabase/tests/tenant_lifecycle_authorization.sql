BEGIN;
SELECT plan(26);

SELECT is(
  (SELECT public FROM storage.buckets WHERE id = 'company-assets'),
  false,
  'company-assets is private so the public object endpoint is disabled'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM (VALUES ('anon'), ('authenticated'), ('service_role')) role_name(name)
    WHERE has_function_privilege(
      role_name.name,
      'public.reserve_ai_request_active_tenant_core(uuid,uuid,text)',
      'EXECUTE'
    )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_proc function_record,
         LATERAL aclexplode(function_record.proacl) privilege
    WHERE function_record.oid =
      'public.reserve_ai_request_active_tenant_core(uuid,uuid,text)'::regprocedure
      AND privilege.grantee = 0
      AND privilege.privilege_type = 'EXECUTE'
  ),
  'no API role can execute the AI reservation core'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM (VALUES ('anon'), ('authenticated'), ('service_role')) role_name(name)
    WHERE has_function_privilege(
      role_name.name,
      'public.get_ai_subscription_state_active_tenant_core(uuid,uuid)',
      'EXECUTE'
    )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_proc function_record,
         LATERAL aclexplode(function_record.proacl) privilege
    WHERE function_record.oid =
      'public.get_ai_subscription_state_active_tenant_core(uuid,uuid)'::regprocedure
      AND privilege.grantee = 0
      AND privilege.privilege_type = 'EXECUTE'
  ),
  'no API role can execute the AI subscription-state core'
);
SELECT is(
  (SELECT proconfig FROM pg_proc
   WHERE oid = 'public.reserve_ai_request(uuid,uuid,text)'::regprocedure),
  ARRAY['search_path=public']::text[],
  'the AI reservation wrapper has an explicit safe search_path'
);
SELECT is(
  (SELECT proconfig FROM pg_proc
   WHERE oid = 'public.get_ai_subscription_state(uuid,uuid)'::regprocedure),
  ARRAY['search_path=public']::text[],
  'the AI subscription-state wrapper has an explicit safe search_path'
);

SELECT has_function_privilege(
  'authenticated',
  'public.manage_tenant_lifecycle(uuid,uuid,text,text,text,text)',
  'EXECUTE'
), 'authenticated can call the guarded lifecycle RPC';
SELECT is(
  (SELECT prosecdef FROM pg_proc
   WHERE oid = 'public.manage_tenant_lifecycle(uuid,uuid,text,text,text,text)'::regprocedure),
  true, 'lifecycle RPC is security definer'
);
SELECT ok(
  position(
    'tenant_has_current_access'
    in pg_get_functiondef('public.current_tenant_id()'::regprocedure)
  ) > 0,
  'the common tenant helper enforces lifecycle and licence access'
);
SELECT ok(
  position(
    'requested_second_confirmation'
    in pg_get_functiondef(
      'public.manage_tenant_lifecycle(uuid,uuid,text,text,text,text)'::regprocedure
    )
  ) > 0,
  'soft delete validates a distinct server-side confirmation'
);

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'lifecycle-admin@example.test', '',
   now(), now(), now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'lifecycle-user@example.test', '',
   now(), now(), now());

INSERT INTO public.platform_admins (user_id)
VALUES ('10000000-0000-0000-0000-000000000001');

INSERT INTO public.tenants (id, name, slug, is_active)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'Tenant Suspension P1', 'tenant-suspension-p1', true),
  ('20000000-0000-0000-0000-000000000002', 'Tenant Suppression P1', 'tenant-suppression-p1', true),
  ('20000000-0000-0000-0000-000000000003', 'Tenant Licence Expirée P1', 'tenant-licence-expiree-p1', true);

UPDATE public.subscriptions
SET status = 'active', starts_at = now() - interval '1 day', ends_at = now() + interval '30 days'
WHERE tenant_id IN (
  '20000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002'
);
UPDATE public.subscriptions
SET status = 'expired', starts_at = now() - interval '30 days', ends_at = now() - interval '1 day'
WHERE tenant_id = '20000000-0000-0000-0000-000000000003';

INSERT INTO public.profiles (id, email, tenant_id)
VALUES (
  '10000000-0000-0000-0000-000000000002',
  'lifecycle-user@example.test',
  '20000000-0000-0000-0000-000000000001'
);

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
SELECT is(
  public.current_tenant_id(),
  '20000000-0000-0000-0000-000000000001'::uuid,
  'an already-open session initially has access'
);

UPDATE public.tenants
SET is_active = false, suspended_at = now()
WHERE id = '20000000-0000-0000-0000-000000000001';
SELECT is(
  public.current_tenant_id(),
  NULL::uuid,
  'an already-open session is blocked immediately after suspension'
);
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM public.profiles
   WHERE id = '10000000-0000-0000-0000-000000000002'),
  0::bigint,
  'a suspended tenant session cannot read its own profile'
);
RESET ROLE;

UPDATE public.profiles
SET tenant_id = '20000000-0000-0000-0000-000000000002'
WHERE id = '10000000-0000-0000-0000-000000000002';
SELECT is(
  public.current_tenant_id(),
  '20000000-0000-0000-0000-000000000002'::uuid,
  'the existing session can access its second active tenant before deletion'
);

INSERT INTO public.parametres (id, tenant_id, company_name, logo_url)
VALUES (
  '30000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000002',
  'Tenant Suppression P1',
  'logo/30000000-0000-0000-0000-000000000002-legacy.png'
);
INSERT INTO storage.objects (bucket_id, name)
VALUES ('company-assets', 'logo/30000000-0000-0000-0000-000000000002-legacy.png');
SELECT set_config('request.jwt.claim.sub', '', true);
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*) FROM storage.objects
   WHERE bucket_id = 'company-assets'
     AND name = 'logo/30000000-0000-0000-0000-000000000002-legacy.png'),
  0::bigint,
  'an anonymous session cannot read a private company asset'
);
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM storage.objects
   WHERE bucket_id = 'company-assets'
     AND name = 'logo/30000000-0000-0000-0000-000000000002-legacy.png'),
  1::bigint,
  'the tenant can still read a legacy logo linked through its settings row'
);
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
SELECT lives_ok(
  $$
    SELECT public.manage_tenant_lifecycle(
      '20000000-0000-0000-0000-000000000002',
      '10000000-0000-0000-0000-000000000001',
      'soft_delete', 'Test session existante',
      'Tenant Suppression P1', 'CONFIRMER LA SUPPRESSION'
    )
  $$,
  'soft delete succeeds with both server confirmations'
);
SELECT throws_ok(
  $$
    SELECT public.manage_tenant_lifecycle(
      '20000000-0000-0000-0000-000000000002',
      '10000000-0000-0000-0000-000000000001',
      'soft_delete', 'Second appel interdit',
      'Tenant Suppression P1', 'CONFIRMER LA SUPPRESSION'
    )
  $$,
  'Ce tenant est déjà supprimé.',
  'a second soft delete is rejected before any write'
);
SELECT is(
  (SELECT deletion_reason FROM public.tenants
   WHERE id = '20000000-0000-0000-0000-000000000002'),
  'Test session existante',
  'a second soft delete does not replace deletion metadata'
);
SELECT is(
  (SELECT count(*) FROM public.tenant_lifecycle_audit
   WHERE tenant_id = '20000000-0000-0000-0000-000000000002'
     AND action = 'soft_deleted'),
  1::bigint,
  'a second soft delete does not add another soft_deleted event'
);
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
SELECT is(
  public.current_tenant_id(),
  NULL::uuid,
  'an already-open session is blocked immediately after soft delete'
);

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
SELECT throws_ok(
  $$
    SELECT public.manage_tenant_lifecycle(
      '20000000-0000-0000-0000-000000000003',
      '10000000-0000-0000-0000-000000000001',
      'soft_delete', 'Test sans confirmation',
      'Tenant Licence Expirée P1', NULL
    )
  $$,
  'La seconde confirmation explicite est obligatoire.',
  'soft delete is refused without the second server confirmation'
);
SELECT throws_ok(
  $$
    SELECT public.manage_tenant_lifecycle(
      '20000000-0000-0000-0000-000000000003',
      '10000000-0000-0000-0000-000000000001',
      'reactivate', 'Test licence expirée', NULL, NULL
    )
  $$,
  'Licence absente, suspendue ou expirée.',
  'reactivation is refused without a current licence'
);
SELECT is(
  (SELECT is_active FROM public.tenants
   WHERE id = '20000000-0000-0000-0000-000000000003'),
  false,
  'failed reactivation never activates the tenant'
);

UPDATE public.tenants
SET deleted_at = now(), deleted_by = '10000000-0000-0000-0000-000000000001',
    deletion_reason = 'Préparation restauration', is_active = false
WHERE id = '20000000-0000-0000-0000-000000000003';
SELECT lives_ok(
  $$
    SELECT public.manage_tenant_lifecycle(
      '20000000-0000-0000-0000-000000000003',
      '10000000-0000-0000-0000-000000000001',
      'restore', 'Test licence expirée', NULL, NULL
    )
  $$,
  'restoring an expired tenant succeeds without bypassing licence state'
);
SELECT is(
  (SELECT is_active FROM public.tenants
   WHERE id = '20000000-0000-0000-0000-000000000003'),
  false,
  'restoring an expired licence leaves the tenant inactive'
);
SELECT is(
  (SELECT deleted_at FROM public.tenants
   WHERE id = '20000000-0000-0000-0000-000000000003'),
  NULL::timestamptz,
  'restore clears only logical-deletion state'
);

SELECT * FROM finish();
ROLLBACK;
