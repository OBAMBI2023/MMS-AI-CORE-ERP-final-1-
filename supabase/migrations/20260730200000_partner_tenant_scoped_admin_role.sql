-- Partner onboarding must never attach a role owned by another tenant.
-- Keep the existing onboarding functions intact and only scope their
-- Administrateur lookup to the tenant they have just created.
DO $migration$
DECLARE
  function_signature regprocedure;
  function_definition text;
  scoped_definition text;
BEGIN
  FOREACH function_signature IN ARRAY ARRAY[
    'public.create_partner_trial(text,text,text,text,text,text,uuid,uuid)'::regprocedure,
    'public.create_partner_paid_tenant(text,text,text,text,text,text,uuid,uuid)'::regprocedure
  ]
  LOOP
    SELECT pg_get_functiondef(function_signature)
    INTO function_definition;

    scoped_definition := replace(
      function_definition,
      'SELECT id INTO admin_role_id FROM public.roles WHERE name = ''Administrateur'';',
      'SELECT id INTO admin_role_id FROM public.roles WHERE tenant_id = target_tenant_id AND name = ''Administrateur'';'
    );

    IF scoped_definition = function_definition THEN
      RAISE EXCEPTION
        'La recherche du rôle Administrateur attendue est absente de %',
        function_signature;
    END IF;

    EXECUTE scoped_definition;
  END LOOP;
END
$migration$;

-- Enforce the tenant/role invariant for every profile write, independently
-- from the caller (RPC, service role or direct SQL).
CREATE OR REPLACE FUNCTION public.validate_profile_role_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.tenant_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.roles role
    WHERE role.id = NEW.role_id
      AND role.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Le rôle sélectionné n''appartient pas au tenant du profil',
      DETAIL = format('profile_id=%s, tenant_id=%s, role_id=%s', NEW.id, NEW.tenant_id, NEW.role_id),
      HINT = 'Sélectionner un role_id filtré par le tenant_id du profil.';
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_validate_profile_role_tenant ON public.profiles;
CREATE TRIGGER trg_validate_profile_role_tenant
  BEFORE INSERT OR UPDATE OF tenant_id, role_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_profile_role_tenant();
