-- Run after migrations. Guards both partner onboarding procedures and the
-- database-wide profile tenant/role invariant.
BEGIN;

DO $$
DECLARE
  function_definition text;
  function_signature regprocedure;
BEGIN
  FOREACH function_signature IN ARRAY ARRAY[
    'public.create_partner_trial(text,text,text,text,text,text,uuid,uuid)'::regprocedure,
    'public.create_partner_paid_tenant(text,text,text,text,text,text,uuid,uuid)'::regprocedure
  ]
  LOOP
    SELECT pg_get_functiondef(function_signature)
    INTO function_definition;

    IF function_definition NOT LIKE
       '%FROM public.roles WHERE tenant_id = target_tenant_id AND name = ''Administrateur''%' THEN
      RAISE EXCEPTION '% ne filtre pas le rôle Administrateur par tenant_id', function_signature;
    END IF;
  END LOOP;

  SELECT pg_get_functiondef(
    'public.validate_profile_role_tenant()'::regprocedure
  )
  INTO function_definition;

  IF function_definition NOT LIKE '%role.tenant_id = NEW.tenant_id%' THEN
    RAISE EXCEPTION 'Le garde-fou profiles/roles ne vérifie pas tenant_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.profiles'::regclass
      AND tgname = 'trg_validate_profile_role_tenant'
      AND NOT tgisinternal
      AND tgenabled <> 'D'
  ) THEN
    RAISE EXCEPTION 'Le garde-fou profiles/roles est absent ou désactivé';
  END IF;
END
$$;

ROLLBACK;
