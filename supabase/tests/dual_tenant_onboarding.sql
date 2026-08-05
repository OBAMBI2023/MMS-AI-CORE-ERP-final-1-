BEGIN;
SELECT plan(27);

SELECT has_function('public','create_public_trial_workspace',ARRAY['uuid','text','text','text','text','text']);
SELECT has_function('public','activate_invited_tenant_after_password',ARRAY[]::text[]);
SELECT has_function('public','mark_invited_tenant_pending_password',ARRAY['uuid','uuid','text']);
SELECT ok(NOT has_function_privilege('anon','public.create_public_trial_workspace(uuid,text,text,text,text,text)','EXECUTE'),'public signup RPC is not browser-callable');
SELECT ok(NOT has_function_privilege('authenticated','public.create_public_trial_workspace(uuid,text,text,text,text,text)','EXECUTE'),'public signup writes remain server-only');
SELECT ok(has_function_privilege('service_role','public.create_public_trial_workspace(uuid,text,text,text,text,text)','EXECUTE'),'service role can create public trials');
SELECT ok(has_function_privilege('authenticated','public.activate_invited_tenant_after_password()','EXECUTE'),'invited user can activate after password setup');
SELECT ok(NOT has_function_privilege('anon','public.activate_invited_tenant_after_password()','EXECUTE'),'anonymous users cannot activate invitations');
SELECT ok(NOT has_function_privilege('authenticated','public.mark_invited_tenant_pending_password(uuid,uuid,text)','EXECUTE'),'pending marker is server-only');
SELECT matches(pg_get_functiondef('public.create_public_trial_workspace(uuid,text,text,text,text,text)'::regprocedure),'interval ''7 days''','trial lasts seven days');
SELECT matches(pg_get_functiondef('public.create_public_trial_workspace(uuid,text,text,text,text,text)'::regprocedure),'trial-phone:','phone uniqueness is enforced under a transaction lock');
SELECT matches(pg_get_functiondef('public.activate_invited_tenant_after_password()'::regprocedure),'auth.uid\(\)','activation is bound to the current Auth user');

-- Sector-driven signup: platform_type, module pack and business_sector all
-- derive from the sector chosen on the public /essai-gratuit form.
INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,raw_user_meta_data,email_confirmed_at,created_at,updated_at) VALUES
('84000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sector-erp@example.test','','{}',now(),now(),now()),
('84000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sector-hotel@example.test','','{}',now(),now(),now()),
('84000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sector-invalid@example.test','','{}',now(),now(),now()),
-- Distinct Auth row whose email only differs by case from user 001's: exercises the
-- case-insensitive profiles.email guard for accounts Auth itself did not dedupe.
('84000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','SECTOR-ERP@EXAMPLE.TEST','','{}',now(),now(),now()),
('84000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sector-dup-phone@example.test','','{}',now(),now(),now());

SELECT throws_ok(
  $$SELECT public.create_public_trial_workspace('84000000-0000-0000-0000-000000000003','Secteur inconnu SARL','Admin Test','sector-invalid@example.test','+225010101','Astrologie')$$,
  '22023','Secteur d''activité invalide','an unlisted sector is rejected server-side'
);
SELECT ok(NOT EXISTS(SELECT 1 FROM public.tenants WHERE name='Secteur inconnu SARL'),'invalid sector leaves no tenant');

SELECT lives_ok(
  $$SELECT public.create_public_trial_workspace('84000000-0000-0000-0000-000000000001','Commerce Test SARL','Admin ERP','sector-erp@example.test','+2250700000001','Commerce')$$,
  'ERP sector signup succeeds'
);
SELECT ok(EXISTS(
  SELECT 1 FROM public.tenants t
  WHERE t.name='Commerce Test SARL' AND t.platform_type='ERP' AND t.business_sector='Commerce' AND t.is_active
),'ERP tenant stores platform_type=ERP and the exact chosen sector');
SELECT ok(EXISTS(
  SELECT 1 FROM public.profiles p
  JOIN public.tenants t ON t.id=p.tenant_id
  JOIN public.roles r ON r.id=p.role_id AND r.tenant_id=t.id
  WHERE p.id='84000000-0000-0000-0000-000000000001' AND t.name='Commerce Test SARL'
    AND r.name='Administrateur' AND p.status='active'
),'ERP admin profile is attached to the tenant with the Administrateur role');
SELECT ok(EXISTS(
  SELECT 1 FROM public.subscriptions s JOIN public.tenants t ON t.id=s.tenant_id
  WHERE t.name='Commerce Test SARL' AND s.status='trial'
    AND s.trial_ends_at BETWEEN s.trial_started_at + interval '6 days 23 hours' AND s.trial_started_at + interval '7 days 1 hour'
),'ERP tenant gets an active 7-day trial');
SELECT ok(EXISTS(
  SELECT 1 FROM public.tenant_modules tm
  JOIN public.tenants t ON t.id=tm.tenant_id
  JOIN public.module_pack_items i ON i.module_id=tm.module_id
  JOIN public.module_packs p ON p.id=i.pack_id AND p.code='commerce'
  WHERE t.name='Commerce Test SARL' AND tm.enabled
),'ERP tenant receives the commerce module pack');

SELECT lives_ok(
  $$SELECT public.create_public_trial_workspace('84000000-0000-0000-0000-000000000002','Hotel Test SARL','Admin Hotel','sector-hotel@example.test','+2250700000002','Hôtel / Résidence / Hébergement')$$,
  'HOTEL sector signup succeeds'
);
SELECT ok(EXISTS(
  SELECT 1 FROM public.tenants t
  WHERE t.name='Hotel Test SARL' AND t.platform_type='HOTEL' AND t.business_sector='Hôtel / Résidence / Hébergement'
),'HOTEL tenant stores platform_type=HOTEL and the exact chosen sector');
SELECT ok(EXISTS(
  SELECT 1 FROM public.profiles p
  JOIN public.tenants t ON t.id=p.tenant_id
  JOIN public.roles r ON r.id=p.role_id AND r.tenant_id=t.id
  WHERE p.id='84000000-0000-0000-0000-000000000002' AND t.name='Hotel Test SARL' AND r.name='Administrateur'
),'HOTEL admin profile gets the Administrateur role');
SELECT ok(EXISTS(
  SELECT 1 FROM public.tenant_modules tm
  JOIN public.tenants t ON t.id=tm.tenant_id
  JOIN public.module_pack_items i ON i.module_id=tm.module_id
  JOIN public.module_packs p ON p.id=i.pack_id AND p.code='hotel'
  WHERE t.name='Hotel Test SARL' AND tm.enabled
),'HOTEL tenant receives the hotel module pack');

SELECT throws_ok(
  $$SELECT public.create_public_trial_workspace('84000000-0000-0000-0000-000000000004','Doublon Email SARL','Admin Doublon','SECTOR-ERP@EXAMPLE.TEST','+2250700000009','Services')$$,
  '23505','Un essai a déjà été utilisé avec cet e-mail','a reused trial email is rejected regardless of case'
);
SELECT ok(NOT EXISTS(SELECT 1 FROM public.tenants WHERE name='Doublon Email SARL'),'duplicate email leaves no tenant');

SELECT throws_ok(
  $$SELECT public.create_public_trial_workspace('84000000-0000-0000-0000-000000000005','Doublon Telephone SARL','Admin Doublon','sector-dup-phone@example.test','+2250700000001','Services')$$,
  '23505','Un essai a déjà été utilisé avec ce téléphone','a reused trial phone number is rejected'
);
SELECT ok(NOT EXISTS(SELECT 1 FROM public.tenants WHERE name='Doublon Telephone SARL'),'duplicate phone leaves no tenant');

SELECT * FROM finish();
ROLLBACK;
