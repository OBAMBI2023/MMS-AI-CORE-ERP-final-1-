BEGIN;
SELECT plan(12);

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

SELECT * FROM finish();
ROLLBACK;
