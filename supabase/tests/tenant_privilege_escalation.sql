BEGIN;
DO $$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef('public.is_admin()'::regprocedure) INTO definition;
  IF definition ILIKE '%Super Admin%' OR definition ILIKE '%super_admin%' THEN
    RAISE EXCEPTION 'is_admin accepte encore un rôle plateforme';
  END IF;

  SELECT pg_get_functiondef('public.is_platform_admin_actor(uuid)'::regprocedure)
  INTO definition;
  IF definition NOT ILIKE '%requested_actor_id = auth.uid()%'
     OR definition NOT ILIKE '%platform_admins%' THEN
    RAISE EXCEPTION 'L’accès plateforme ne dépend pas strictement de auth.uid()';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.roles'::regclass
      AND conname = 'roles_tenant_role_name_check'
  ) THEN RAISE EXCEPTION 'Liste blanche des rôles tenant absente'; END IF;

  IF has_column_privilege('authenticated', 'public.profiles', 'role_id', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.profiles', 'tenant_id', 'UPDATE')
  THEN RAISE EXCEPTION 'Modification directe de role_id/tenant_id encore permise'; END IF;
END
$$;
ROLLBACK;
