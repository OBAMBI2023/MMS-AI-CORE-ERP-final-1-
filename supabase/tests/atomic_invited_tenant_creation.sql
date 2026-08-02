BEGIN;
SELECT plan(15);

INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,raw_user_meta_data,email_confirmed_at,created_at,updated_at) VALUES
('83000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','atomic-platform@example.test','','{}',now(),now(),now()),
('83000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','atomic-erp@example.test','','{}',NULL,now(),now()),
('83000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','atomic-hotel@example.test','','{}',NULL,now(),now()),
('83000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','atomic-failure@example.test','','{}',NULL,now(),now());
INSERT INTO public.platform_admins(user_id) VALUES('83000000-0000-0000-0000-000000000001');

SELECT throws_ok($$SELECT public.create_invited_tenant_atomic('Bad platform','Bad Admin','atomic-failure@example.test','83000000-0000-0000-0000-000000000004','83000000-0000-0000-0000-000000000001','BROKEN','monthly',30,'{}')$$,'22023','Plateforme invalide','platform failure rolls back');
SELECT is((SELECT tenant_id FROM public.profiles WHERE id='83000000-0000-0000-0000-000000000004'),NULL::uuid,'platform failure leaves no tenant link');

SELECT throws_ok($$SELECT public.create_invited_tenant_atomic('Bad modules','Bad Admin','atomic-failure@example.test','83000000-0000-0000-0000-000000000004','83000000-0000-0000-0000-000000000001','ERP','monthly',30,ARRAY['ffffffff-ffff-ffff-ffff-ffffffffffff']::uuid[])$$,'23514','Un ou plusieurs modules ERP sont invalides ou inactifs','module failure rolls back');
SELECT is((SELECT tenant_id FROM public.profiles WHERE id='83000000-0000-0000-0000-000000000004'),NULL::uuid,'module failure leaves no tenant link');
SELECT ok(NOT EXISTS(SELECT 1 FROM public.tenants WHERE name IN('Bad platform','Bad modules')),'failed calls leave no tenant');

CREATE FUNCTION public.test_fail_pending_password() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF NEW.status='pending_password' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='forced pending_password failure'; END IF; RETURN NEW; END$$;
CREATE TRIGGER test_fail_pending_password BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.test_fail_pending_password();
SELECT throws_ok($$SELECT public.create_invited_tenant_atomic('Bad pending','Bad Admin','atomic-failure@example.test','83000000-0000-0000-0000-000000000004','83000000-0000-0000-0000-000000000001','ERP','monthly',30,'{}')$$,'23514','forced pending_password failure','pending_password failure rolls back');
SELECT is((SELECT tenant_id FROM public.profiles WHERE id='83000000-0000-0000-0000-000000000004'),NULL::uuid,'pending failure leaves no tenant link');
SELECT ok(NOT EXISTS(SELECT 1 FROM public.tenants WHERE name='Bad pending'),'pending failure leaves no tenant');
DROP TRIGGER test_fail_pending_password ON public.profiles;
DROP FUNCTION public.test_fail_pending_password();

SELECT lives_ok($$SELECT public.create_invited_tenant_atomic('Atomic ERP','ERP Admin','atomic-erp@example.test','83000000-0000-0000-0000-000000000002','83000000-0000-0000-0000-000000000001','ERP','monthly',30,'{}')$$,'ERP transaction succeeds');
SELECT ok(EXISTS(SELECT 1 FROM public.profiles p JOIN public.tenants t ON t.id=p.tenant_id JOIN public.roles r ON r.id=p.role_id AND r.tenant_id=t.id JOIN public.subscriptions s ON s.tenant_id=t.id WHERE p.id='83000000-0000-0000-0000-000000000002' AND p.status='pending_password' AND t.onboarding_status='pending_password' AND NOT t.is_active AND s.status='active' AND r.name='Administrateur'),'ERP invariant is complete');

SELECT lives_ok($$SELECT public.create_invited_tenant_atomic('Atomic HOTEL','HOTEL Admin','atomic-hotel@example.test','83000000-0000-0000-0000-000000000003','83000000-0000-0000-0000-000000000001','HOTEL','monthly',30,'{}')$$,'HOTEL transaction succeeds');
SELECT ok(EXISTS(SELECT 1 FROM public.profiles p JOIN public.tenants t ON t.id=p.tenant_id JOIN public.roles r ON r.id=p.role_id AND r.tenant_id=t.id JOIN public.subscriptions s ON s.tenant_id=t.id WHERE p.id='83000000-0000-0000-0000-000000000003' AND t.platform_type='HOTEL' AND r.name='Administrateur' AND s.status='active'),'HOTEL invariant is complete');
SELECT ok((SELECT count(*)>0 FROM public.tenant_modules tm JOIN public.profiles p ON p.tenant_id=tm.tenant_id WHERE p.id='83000000-0000-0000-0000-000000000003' AND tm.enabled),'HOTEL modules exist');
SELECT ok(NOT EXISTS(SELECT 1 FROM public.tenants t WHERE t.name LIKE 'Atomic %' AND NOT EXISTS(SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id=p.role_id AND r.tenant_id=t.id WHERE p.tenant_id=t.id AND r.name='Administrateur')),'no invited tenant lacks an administrator');
SELECT ok(NOT EXISTS(SELECT 1 FROM public.profiles p LEFT JOIN auth.users u ON u.id=p.id WHERE p.id IN('83000000-0000-0000-0000-000000000002','83000000-0000-0000-0000-000000000003') AND u.id IS NULL),'no invited profile lacks an Auth user');

SELECT * FROM finish();
ROLLBACK;
