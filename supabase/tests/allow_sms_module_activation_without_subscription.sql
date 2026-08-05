BEGIN;
SELECT plan(12);

-- The activation-blocking trigger and its function are gone; the deactivation
-- guard (trg_enforce_active_premium_tenant_module) is untouched.
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'enforce_premium_module_subscription'
      AND tgrelid = 'public.tenant_modules'::regclass
  ),
  'the enforce_premium_module_subscription trigger no longer exists on tenant_modules'
);
SELECT ok(
  NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'enforce_premium_module_subscription'),
  'the enforce_premium_module_subscription function was dropped'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_enforce_active_premium_tenant_module'
      AND tgrelid = 'public.tenant_modules'::regclass
  ),
  'the unrelated active-subscription deactivation guard remains in place'
);

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_user_meta_data, email_confirmed_at, created_at, updated_at
) VALUES (
  '84000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'sms-no-subscription-trial@example.test', '',
  '{}'::jsonb, now(), now(), now()
);
INSERT INTO public.profiles (id, email, status)
VALUES ('84000000-0000-0000-0000-000000000001', 'sms-no-subscription-trial@example.test', 'pending')
ON CONFLICT (id) DO UPDATE SET tenant_id = NULL, status = 'pending';

SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', 'service_role', true);

-- 1) A Hôtel-sector tenant can be created even though its pack advertises hotel_sms.
SELECT lives_ok(
  $$
    SELECT public.create_public_trial_workspace(
      '84000000-0000-0000-0000-000000000001', 'SMS No Subscription Hotel', 'Trial Admin',
      'sms-no-subscription-trial@example.test', '+2250700000099', 'Hôtel / Résidence / Hébergement'
    )
  $$,
  'creating a Hôtel-sector tenant no longer fails because hotel_sms has no subscription'
);

CREATE TEMP TABLE sms_trial_fixture ON COMMIT DROP AS
SELECT profile.tenant_id FROM public.profiles profile
WHERE profile.id = '84000000-0000-0000-0000-000000000001';

-- 2) The module comes out enabled, and still with no active subscription.
SELECT ok(
  EXISTS (
    SELECT 1 FROM public.tenant_modules assignment
    JOIN public.erp_modules module ON module.id = assignment.module_id
    JOIN sms_trial_fixture fixture ON fixture.tenant_id = assignment.tenant_id
    WHERE module.code = 'hotel_sms' AND assignment.enabled
  ),
  'the hotel_sms module is enabled for the new tenant as part of its sector pack'
);
SELECT is(
  (SELECT count(*) FROM public.tenant_module_subscriptions subscription
   JOIN public.erp_modules module ON module.id = subscription.module_id
   JOIN sms_trial_fixture fixture ON fixture.tenant_id = subscription.tenant_id
   WHERE module.code = 'hotel_sms' AND subscription.status = 'active'),
  0::bigint,
  'the tenant has no active SMS subscription'
);

-- 3) Manually toggling the module off then back on without a subscription still works.
SELECT lives_ok(
  $$
    UPDATE public.tenant_modules assignment
    SET enabled = false
    FROM public.erp_modules module, sms_trial_fixture fixture
    WHERE assignment.module_id = module.id AND module.code = 'hotel_sms'
      AND assignment.tenant_id = fixture.tenant_id
  $$,
  'the SMS module can be disabled without an active subscription'
);
SELECT lives_ok(
  $$
    UPDATE public.tenant_modules assignment
    SET enabled = true
    FROM public.erp_modules module, sms_trial_fixture fixture
    WHERE assignment.module_id = module.id AND module.code = 'hotel_sms'
      AND assignment.tenant_id = fixture.tenant_id
  $$,
  'the SMS module can be (re-)activated without an active subscription'
);

-- 4) Sending an SMS is still gated on an active subscription and credit: the
-- reservation trigger on hotel_sms_logs and its guard message are untouched
-- (a full send also needs a reservation/guest fixture, exercised end to end
-- by the application; here we assert the live DB object it depends on).
SELECT has_trigger(
  'public', 'hotel_sms_logs', 'reserve_hotel_sms_credit',
  'the SMS credit-reservation guard trigger is still attached to hotel_sms_logs'
);
SELECT ok(
  pg_get_functiondef('public.reserve_hotel_sms_credit()'::regprocedure) ~ 'nécessite un abonnement actif',
  'sending an SMS is still refused without an active subscription'
);
SELECT ok(
  pg_get_functiondef('public.reserve_hotel_sms_credit()'::regprocedure) ~ 'Quota SMS épuisé',
  'sending an SMS is still refused once SMS credits are exhausted'
);

-- 5) Unrelated module handling (dashboard always enabled) is unaffected.
SELECT ok(
  EXISTS (
    SELECT 1 FROM public.tenant_modules assignment
    JOIN public.erp_modules module ON module.id = assignment.module_id
    JOIN sms_trial_fixture fixture ON fixture.tenant_id = assignment.tenant_id
    WHERE module.code = 'dashboard' AND assignment.enabled
  ),
  'the dashboard module remains enabled, unaffected by the SMS trigger removal'
);

SELECT * FROM finish();
ROLLBACK;
