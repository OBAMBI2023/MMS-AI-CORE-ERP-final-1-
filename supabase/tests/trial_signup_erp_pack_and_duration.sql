-- Run after migrations. Covers the public /essai-gratuit ERP-only signup
-- flow: profiles.status uses the canonical 'active' value, the trial lasts
-- 7 days, only the Pack Commerce générale modules get enabled, the created
-- tenant is linked back to the profile, and hôtel-like activities still
-- provision the same ERP workspace (no HOTEL branching yet). Any failed
-- assertion aborts the transaction.
BEGIN;
SELECT plan(21);

-- Two fake auth users: one picks a hôtel-like activity, the other a
-- commerce-like activity. Both must produce the exact same ERP outcome.
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
) VALUES
  ('90000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'trial-hotel@example.test', '',
   now(), now(), now()),
  ('90000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'trial-commerce@example.test', '',
   now(), now(), now());

-- tg_handle_new_user already created the matching profiles rows.
SELECT is(
  (SELECT status FROM public.profiles WHERE id = '90000000-0000-0000-0000-000000000001'),
  'active',
  'the auth trigger creates the profile with the canonical active status'
);

DO $$
DECLARE
  hotel_result jsonb;
  commerce_result jsonb;
BEGIN
  hotel_result := public.create_trial_workspace(
    '90000000-0000-0000-0000-000000000001',
    'Auberge Test',
    'Amina Traoré',
    'trial-hotel@example.test',
    '+225070000001',
    'hotel'
  );
  PERFORM set_config('trial_signup_test.hotel_tenant_id', hotel_result ->> 'tenantId', true);

  commerce_result := public.create_trial_workspace(
    '90000000-0000-0000-0000-000000000002',
    'Boutique Test',
    'Koffi N''Guessan',
    'trial-commerce@example.test',
    '+225070000002',
    'commerce'
  );
  PERFORM set_config('trial_signup_test.commerce_tenant_id', commerce_result ->> 'tenantId', true);
END;
$$;

-- --- platform_type stays ERP for every activity today, including hôtel ---
SELECT is(
  (SELECT platform_type FROM public.tenants
   WHERE id = current_setting('trial_signup_test.hotel_tenant_id')::uuid),
  'ERP',
  'a hôtel activity still provisions an ERP platform_type tenant for now'
);
SELECT is(
  (SELECT signup_activity FROM public.tenants
   WHERE id = current_setting('trial_signup_test.hotel_tenant_id')::uuid),
  'hotel',
  'the chosen activity is persisted for a future HOTEL branch'
);
SELECT is(
  (SELECT platform_type FROM public.tenants
   WHERE id = current_setting('trial_signup_test.commerce_tenant_id')::uuid),
  'ERP',
  'a commerce activity provisions an ERP platform_type tenant'
);

-- --- profiles.status regression guard (the 'actif' vs 'active' bug) ---
SELECT is(
  (SELECT status FROM public.profiles WHERE id = '90000000-0000-0000-0000-000000000001'),
  'active',
  'create_trial_workspace writes the canonical active status, not actif'
);

-- --- the created tenant is linked back to the owning profile ---
SELECT is(
  (SELECT tenant_id FROM public.profiles WHERE id = '90000000-0000-0000-0000-000000000001'),
  current_setting('trial_signup_test.hotel_tenant_id')::uuid,
  'the profile is linked to the tenant created for it'
);

-- --- the trial subscription lasts exactly 7 days ---
SELECT is(
  (SELECT status FROM public.subscriptions
   WHERE tenant_id = current_setting('trial_signup_test.hotel_tenant_id')::uuid),
  'trial'::public.subscription_status,
  'the subscription status is trial'
);
SELECT ok(
  (SELECT trial_ends_at - trial_started_at FROM public.subscriptions
   WHERE tenant_id = current_setting('trial_signup_test.hotel_tenant_id')::uuid)
    BETWEEN interval '6 days 23 hours' AND interval '7 days 1 hour',
  'the free trial lasts 7 days, not 3'
);
SELECT is(
  (SELECT amount FROM public.subscriptions
   WHERE tenant_id = current_setting('trial_signup_test.hotel_tenant_id')::uuid),
  0::numeric,
  'the trial subscription is free'
);

-- --- only the Pack Commerce générale modules are enabled ---
SELECT is(
  (SELECT code FROM public.module_packs mp
   JOIN public.tenant_module_packs tmp ON tmp.pack_id = mp.id
   WHERE tmp.tenant_id = current_setting('trial_signup_test.hotel_tenant_id')::uuid),
  'commerce_generale',
  'the tenant is assigned the Pack Commerce générale'
);
SELECT ok(
  (SELECT count(*) FROM public.tenant_modules tm
   WHERE tm.tenant_id = current_setting('trial_signup_test.hotel_tenant_id')::uuid
     AND tm.enabled) > 0,
  'at least one module is enabled'
);
SELECT is(
  (
    SELECT array_agg(module.code ORDER BY module.code)
    FROM public.tenant_modules tm
    JOIN public.erp_modules module ON module.id = tm.module_id
    WHERE tm.tenant_id = current_setting('trial_signup_test.hotel_tenant_id')::uuid
      AND tm.enabled
  ),
  (
    SELECT array_agg(module.code ORDER BY module.code)
    FROM public.module_pack_items item
    JOIN public.module_packs pack ON pack.id = item.pack_id
    JOIN public.erp_modules module ON module.id = item.module_id
    WHERE pack.code = 'commerce_generale'
  ),
  'exactly and only the Pack Commerce générale modules are enabled'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM public.tenant_modules tm
    JOIN public.erp_modules module ON module.id = tm.module_id
    WHERE tm.tenant_id = current_setting('trial_signup_test.hotel_tenant_id')::uuid
      AND tm.enabled
      AND module.code = 'ai_assistant'
  ),
  'the opt-in AI assistant module stays disabled for a fresh trial'
);

-- --- no orphaned rows are left if the RPC fails midway ---
SELECT throws_ok(
  $$
    SELECT public.create_trial_workspace(
      '90000000-0000-0000-0000-000000000001', 'Second Espace', 'x',
      'trial-hotel@example.test', '+225070000001', 'commerce'
    )
  $$,
  'Un espace existe déjà pour ce compte',
  'a second onboarding for the same user is rejected'
);
SELECT is(
  (SELECT count(*) FROM public.tenants
   WHERE name = 'Second Espace'),
  0::bigint,
  'the rejected second onboarding leaves no orphaned tenant'
);

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
) VALUES (
  '90000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'trial-missing-pack@example.test', '',
  now(), now(), now()
);
UPDATE public.module_packs SET is_active = false WHERE code = 'commerce_generale';
SELECT throws_ok(
  $$
    SELECT public.create_trial_workspace(
      '90000000-0000-0000-0000-000000000003', 'Espace Sans Pack', 'x',
      'trial-missing-pack@example.test', '+225070000003', 'commerce'
    )
  $$,
  'Le pack Commerce générale est introuvable',
  'onboarding fails cleanly if the pack is unavailable'
);
SELECT is(
  (SELECT count(*) FROM public.tenants WHERE name = 'Espace Sans Pack'),
  0::bigint,
  'a failed onboarding never leaves an orphaned tenant'
);
SELECT is(
  (SELECT tenant_id FROM public.profiles WHERE id = '90000000-0000-0000-0000-000000000003'),
  NULL::uuid,
  'a failed onboarding never links the profile to a tenant'
);
UPDATE public.module_packs SET is_active = true WHERE code = 'commerce_generale';

-- --- consume_trial_signup_attempt also rate-limits by phone number ---
DO $$
DECLARE
  attempt_index integer;
  allowed boolean;
BEGIN
  FOR attempt_index IN 1..5 LOOP
    allowed := public.consume_trial_signup_attempt(
      '203.0.113.' || attempt_index, 'phone-test-' || attempt_index || '@example.test',
      '+225071234567'
    );
    IF NOT allowed THEN
      RAISE EXCEPTION 'attempt % unexpectedly blocked', attempt_index;
    END IF;
  END LOOP;
END;
$$;
SELECT is(
  public.consume_trial_signup_attempt(
    '203.0.113.99', 'phone-test-6@example.test', '+225071234567'
  ),
  false,
  'a 6th signup attempt reusing the same phone number within the window is blocked'
);

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.create_trial_workspace(uuid,text,text,text,text,text)',
    'EXECUTE'
  ),
  'authenticated cannot call create_trial_workspace directly'
);
SELECT ok(
  has_function_privilege(
    'service_role',
    'public.create_trial_workspace(uuid,text,text,text,text,text)',
    'EXECUTE'
  ),
  'service_role can call create_trial_workspace'
);

SELECT * FROM finish();
ROLLBACK;
