-- Tenant roles never grant platform access. Platform administration is based
-- exclusively on platform_admins membership for the authenticated auth.uid().
CREATE OR REPLACE FUNCTION public.is_platform_admin_actor(requested_actor_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT requested_actor_id IS NOT NULL
    AND (
      requested_actor_id = auth.uid()
      OR (auth.uid() IS NULL AND auth.role() = 'service_role')
    )
    AND EXISTS (
      SELECT 1 FROM public.platform_admins administrator
      WHERE administrator.user_id = requested_actor_id
    )
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin_actor(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin_actor(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.current_tenant_id() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles profile
    JOIN public.roles role
      ON role.id = profile.role_id AND role.tenant_id = profile.tenant_id
    WHERE profile.id = auth.uid() AND role.name = 'Administrateur'
  )
$$;

-- Ensure all seven supported roles exist before remapping legacy profiles.
DO $$
DECLARE tenant record;
BEGIN
  FOR tenant IN SELECT id FROM public.tenants LOOP
    INSERT INTO public.roles (tenant_id, name, description) VALUES
      (tenant.id, 'Administrateur', 'Accès total à tous les modules'),
      (tenant.id, 'Gérant', 'Gestion opérationnelle du tenant'),
      (tenant.id, 'Manager', 'Gestion des ventes, achats, dépenses et rapports'),
      (tenant.id, 'Comptable', 'Gestion des dépenses et rapports financiers'),
      (tenant.id, 'Commercial', 'Gestion commerciale du tenant'),
      (tenant.id, 'Caissier', 'Gestion des ventes POS'),
      (tenant.id, 'Employé', 'Accès limité')
    ON CONFLICT (tenant_id, name) DO NOTHING;
  END LOOP;
END
$$;

-- Legacy platform-like tenant roles become Administrateur. Other unsupported
-- custom roles are downgraded to Employé.
UPDATE public.profiles profile
SET role_id = replacement.id
FROM public.roles source_role
JOIN public.roles replacement
  ON replacement.tenant_id = source_role.tenant_id
 AND replacement.name = CASE
   WHEN lower(replace(source_role.name, ' ', '_')) = 'super_admin'
     THEN 'Administrateur' ELSE 'Employé' END
WHERE profile.role_id = source_role.id
  AND source_role.name NOT IN (
    'Administrateur', 'Gérant', 'Manager', 'Comptable',
    'Commercial', 'Caissier', 'Employé'
  );

DELETE FROM public.roles WHERE name NOT IN (
  'Administrateur', 'Gérant', 'Manager', 'Comptable',
  'Commercial', 'Caissier', 'Employé'
);

ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS roles_tenant_role_name_check;
ALTER TABLE public.roles ADD CONSTRAINT roles_tenant_role_name_check
CHECK (name IN (
  'Administrateur', 'Gérant', 'Manager', 'Comptable',
  'Commercial', 'Caissier', 'Employé'
));

-- Profiles-level invariant: reject platform roles, cross-tenant assignments,
-- and self-service changes to role or tenant.
CREATE OR REPLACE FUNCTION public.validate_profile_role_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE selected_role public.roles%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' AND auth.uid() = OLD.id
     AND (NEW.role_id IS DISTINCT FROM OLD.role_id
       OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Un utilisateur ne peut pas modifier son propre rôle ou tenant_id';
  END IF;

  IF NEW.role_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO selected_role FROM public.roles role WHERE role.id = NEW.role_id;
  IF NOT FOUND OR selected_role.tenant_id IS DISTINCT FROM NEW.tenant_id
     OR selected_role.name NOT IN (
       'Administrateur', 'Gérant', 'Manager', 'Comptable',
       'Commercial', 'Caissier', 'Employé'
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'Attribution de rôle refusée',
      DETAIL = format('profile_id=%s, tenant_id=%s, role_id=%s',
        NEW.id, NEW.tenant_id, NEW.role_id);
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_enforce_profile_role_tenant ON public.profiles;
DROP TRIGGER IF EXISTS trg_validate_profile_role_tenant ON public.profiles;
CREATE TRIGGER trg_validate_profile_role_tenant
  BEFORE INSERT OR UPDATE OF tenant_id, role_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_profile_role_tenant();

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, username, phone, avatar_url) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id AND tenant_id = public.current_tenant_id())
WITH CHECK (auth.uid() = id AND tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "profiles_read_own_or_tenant_admin" ON public.profiles;
CREATE POLICY "profiles_read_own_or_tenant_admin" ON public.profiles
FOR SELECT TO authenticated USING (
  tenant_id = public.current_tenant_id()
  AND (auth.uid() = id OR public.is_admin())
);

-- Existing onboarding calls initialize_tenant_roles; redefine it to add the
-- missing Commercial role without weakening its service-role-only grants.
CREATE OR REPLACE FUNCTION public.ensure_tenant_commercial_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.roles (tenant_id, name, description)
  VALUES (NEW.id, 'Commercial', 'Gestion commerciale du tenant')
  ON CONFLICT (tenant_id, name) DO NOTHING;
  RETURN NEW;
END
$$;
DROP TRIGGER IF EXISTS trg_ensure_tenant_commercial_role ON public.tenants;
CREATE TRIGGER trg_ensure_tenant_commercial_role AFTER INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.ensure_tenant_commercial_role();
