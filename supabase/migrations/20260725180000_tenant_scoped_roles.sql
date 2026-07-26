-- Tenant-scoped RBAC.
-- This migration deliberately keeps every existing role row. For each legacy
-- global role, the original UUID is retained for one tenant and copies are made
-- for the other tenants. Profiles are then remapped by tenant and role name.

ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS tenant_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.roles'::regclass
      AND conname = 'roles_tenant_id_fkey'
      AND contype = 'f'
  ) THEN
    ALTER TABLE public.roles
      ADD CONSTRAINT roles_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;
  END IF;
END
$$;

-- Remove only historical UNIQUE constraints/indexes whose sole key is name.
DO $$
DECLARE
  item record;
BEGIN
  FOR item IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.roles'::regclass
      AND c.contype = 'u'
      AND (
        SELECT array_agg(a.attname ORDER BY key_position.ordinality)
        FROM unnest(c.conkey) WITH ORDINALITY AS key_position(attnum, ordinality)
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid
         AND a.attnum = key_position.attnum
      ) = ARRAY['name']::name[]
  LOOP
    EXECUTE format('ALTER TABLE public.roles DROP CONSTRAINT %I', item.conname);
  END LOOP;

  FOR item IN
    SELECT indexrelid::regclass AS index_name
    FROM pg_index
    WHERE indrelid = 'public.roles'::regclass
      AND indisunique
      AND indexrelid NOT IN (
        SELECT conindid
        FROM pg_constraint
        WHERE conrelid = 'public.roles'::regclass
      )
      AND (
        SELECT array_agg(a.attname ORDER BY key_position.ordinality)
        FROM unnest(indkey) WITH ORDINALITY AS key_position(attnum, ordinality)
        JOIN pg_attribute a
          ON a.attrelid = indrelid
         AND a.attnum = key_position.attnum
        WHERE key_position.attnum > 0
      ) = ARRAY['name']::name[]
  LOOP
    EXECUTE format('DROP INDEX %s', item.index_name);
  END LOOP;
END
$$;

DO $$
DECLARE
  first_tenant_id uuid;
  unmigrated_profiles bigint;
  cross_tenant_profiles bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM public.roles WHERE tenant_id IS NULL)
     AND NOT EXISTS (SELECT 1 FROM public.tenants) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Migration RBAC impossible: aucun tenant disponible pour les rôles existants',
      HINT = 'Créer au moins un tenant et renseigner profiles.tenant_id avant de rejouer la migration.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE role_id IS NOT NULL
      AND tenant_id IS NULL
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Migration RBAC impossible: des profils avec rôle n''ont pas de tenant',
      HINT = 'Renseigner profiles.tenant_id pour tous les utilisateurs ayant un rôle.';
  END IF;

  CREATE TEMP TABLE legacy_roles_snapshot ON COMMIT DROP AS
  SELECT id, name, description, created_at
  FROM public.roles
  WHERE tenant_id IS NULL;

  IF EXISTS (SELECT 1 FROM legacy_roles_snapshot) THEN
    SELECT id
    INTO first_tenant_id
    FROM public.tenants
    ORDER BY id
    LIMIT 1;

    -- The original role is retained for a tenant already using it when possible.
    CREATE TEMP TABLE legacy_role_keepers ON COMMIT DROP AS
    SELECT legacy.id AS role_id,
           COALESCE(
             (
               SELECT profile.tenant_id
               FROM public.profiles profile
               WHERE profile.role_id = legacy.id
               ORDER BY profile.tenant_id
               LIMIT 1
             ),
             first_tenant_id
           ) AS tenant_id
    FROM legacy_roles_snapshot legacy;

    UPDATE public.roles role
    SET tenant_id = keeper.tenant_id
    FROM legacy_role_keepers keeper
    WHERE role.id = keeper.role_id
      AND role.tenant_id IS NULL;

    INSERT INTO public.roles (tenant_id, name, description, created_at)
    SELECT tenant.id, legacy.name, legacy.description, legacy.created_at
    FROM public.tenants tenant
    CROSS JOIN legacy_roles_snapshot legacy
    JOIN legacy_role_keepers keeper ON keeper.role_id = legacy.id
    WHERE tenant.id <> keeper.tenant_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.roles existing
        WHERE existing.tenant_id = tenant.id
          AND existing.name = legacy.name
      );

    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT tenant_role.id, legacy_permission.permission_id
    FROM legacy_roles_snapshot legacy
    JOIN public.role_permissions legacy_permission
      ON legacy_permission.role_id = legacy.id
    JOIN public.roles tenant_role
      ON tenant_role.name = legacy.name
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    UPDATE public.profiles profile
    SET role_id = tenant_role.id
    FROM legacy_roles_snapshot legacy
    JOIN public.roles tenant_role
      ON tenant_role.name = legacy.name
    WHERE profile.role_id = legacy.id
      AND tenant_role.tenant_id = profile.tenant_id;
  END IF;

  SELECT count(*)
  INTO unmigrated_profiles
  FROM public.profiles profile
  LEFT JOIN public.roles role ON role.id = profile.role_id
  WHERE profile.role_id IS NOT NULL
    AND role.id IS NULL;

  SELECT count(*)
  INTO cross_tenant_profiles
  FROM public.profiles profile
  JOIN public.roles role ON role.id = profile.role_id
  WHERE profile.tenant_id IS DISTINCT FROM role.tenant_id;

  IF unmigrated_profiles > 0 OR cross_tenant_profiles > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = format(
        'Migration RBAC annulée: %s profil(s) sans rôle valide, %s association(s) inter-tenant',
        unmigrated_profiles,
        cross_tenant_profiles
      ),
      HINT = 'Vérifier profiles.role_id, profiles.tenant_id et les rôles sources.';
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_roles_tenant_id ON public.roles(tenant_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.roles'::regclass
      AND conname = 'roles_tenant_id_name_key'
      AND contype = 'u'
  ) THEN
    ALTER TABLE public.roles
      ADD CONSTRAINT roles_tenant_id_name_key UNIQUE (tenant_id, name);
  END IF;
END
$$;

ALTER TABLE public.roles
  ALTER COLUMN tenant_id SET NOT NULL;

-- Database-level invariant: a profile and its role must belong to one tenant.
CREATE OR REPLACE FUNCTION public.enforce_profile_role_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_role_tenant uuid;
BEGIN
  IF TG_OP = 'UPDATE'
     AND auth.uid() IS NOT NULL
     AND OLD.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Le tenant d''un profil ne peut pas être modifié par l''utilisateur',
      DETAIL = format('profile_id=%s, old_tenant_id=%s, new_tenant_id=%s',
        NEW.id, OLD.tenant_id, NEW.tenant_id),
      HINT = 'Utiliser le flux serveur d''administration du tenant.';
  END IF;

  IF NEW.role_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT tenant_id
  INTO selected_role_tenant
  FROM public.roles
  WHERE id = NEW.role_id;

  IF selected_role_tenant IS NULL OR NEW.tenant_id IS DISTINCT FROM selected_role_tenant THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Le rôle sélectionné n''appartient pas au tenant du profil',
      DETAIL = format('profile_tenant_id=%s, role_id=%s, role_tenant_id=%s',
        NEW.tenant_id, NEW.role_id, selected_role_tenant),
      HINT = 'Sélectionner un rôle appartenant au même tenant que le profil.';
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_enforce_profile_role_tenant ON public.profiles;
CREATE CONSTRAINT TRIGGER trg_enforce_profile_role_tenant
  AFTER INSERT OR UPDATE OF tenant_id, role_id ON public.profiles
  DEFERRABLE INITIALLY IMMEDIATE
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_role_tenant();

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles profile
    JOIN public.roles role
      ON role.id = profile.role_id
     AND role.tenant_id = profile.tenant_id
    WHERE profile.id = auth.uid()
      AND role.name IN ('Administrateur', 'Super Admin')
  )
$$;

-- Existing policies were global because is_admin() did not check tenant
-- ownership. Replace only the three RBAC policies and the admin profile scope.
DROP POLICY IF EXISTS "admin_all_access_roles" ON public.roles;
DROP POLICY IF EXISTS "tenant_roles_select" ON public.roles;
DROP POLICY IF EXISTS "tenant_admin_roles_insert" ON public.roles;
DROP POLICY IF EXISTS "tenant_admin_roles_update" ON public.roles;
DROP POLICY IF EXISTS "tenant_admin_roles_delete" ON public.roles;
CREATE POLICY "tenant_roles_select" ON public.roles
  FOR SELECT
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY "tenant_admin_roles_insert" ON public.roles
  FOR INSERT
  WITH CHECK (public.is_admin() AND tenant_id = public.current_tenant_id());
CREATE POLICY "tenant_admin_roles_update" ON public.roles
  FOR UPDATE
  USING (public.is_admin() AND tenant_id = public.current_tenant_id())
  WITH CHECK (public.is_admin() AND tenant_id = public.current_tenant_id());
CREATE POLICY "tenant_admin_roles_delete" ON public.roles
  FOR DELETE
  USING (public.is_admin() AND tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "admin_all_access_role_perms" ON public.role_permissions;
DROP POLICY IF EXISTS "tenant_role_permissions_select" ON public.role_permissions;
DROP POLICY IF EXISTS "tenant_admin_role_permissions_insert" ON public.role_permissions;
DROP POLICY IF EXISTS "tenant_admin_role_permissions_delete" ON public.role_permissions;
CREATE POLICY "tenant_role_permissions_select" ON public.role_permissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.roles role
      WHERE role.id = role_permissions.role_id
        AND role.tenant_id = public.current_tenant_id()
    )
  );
CREATE POLICY "tenant_admin_role_permissions_insert" ON public.role_permissions
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    AND EXISTS (
      SELECT 1 FROM public.roles role
      WHERE role.id = role_permissions.role_id
        AND role.tenant_id = public.current_tenant_id()
    )
  );
CREATE POLICY "tenant_admin_role_permissions_delete" ON public.role_permissions
  FOR DELETE
  USING (
    public.is_admin()
    AND EXISTS (
      SELECT 1 FROM public.roles role
      WHERE role.id = role_permissions.role_id
        AND role.tenant_id = public.current_tenant_id()
    )
  );

-- Permission definitions contain no tenant data and must remain readable so
-- non-admin users can resolve the codes granted to their tenant role.
DROP POLICY IF EXISTS "authenticated_read_permissions" ON public.permissions;
CREATE POLICY "authenticated_read_permissions" ON public.permissions
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_read_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_own_or_tenant_admin" ON public.profiles;
CREATE POLICY "profiles_read_own_or_tenant_admin" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR (public.is_admin() AND tenant_id = public.current_tenant_id())
  );

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create the six standard roles and copy permissions from the same tenant's
-- existing templates. Gérant inherits Manager permissions when no Gérant
-- template exists. Administrateur always receives every permission.
CREATE OR REPLACE FUNCTION public.initialize_tenant_roles(
  target_tenant_id uuid,
  first_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role record;
  created_role_id uuid;
  admin_role_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = target_tenant_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'Tenant introuvable',
      DETAIL = format('tenant_id=%s', target_tenant_id),
      HINT = 'Créer le tenant avant d''initialiser ses rôles.';
  END IF;

  FOR default_role IN
    SELECT *
    FROM (VALUES
      ('Administrateur', 'Accès total à tous les modules', 'Administrateur'),
      ('Manager', 'Gestion des ventes, achats, dépenses et rapports', 'Manager'),
      ('Gérant', 'Gestion opérationnelle du tenant', 'Manager'),
      ('Comptable', 'Gestion des dépenses et rapports financiers', 'Comptable'),
      ('Caissier', 'Gestion exclusive des ventes POS', 'Caissier'),
      ('Employé', 'Accès limité (lecture seulement)', 'Employé')
    ) AS defaults(name, description, template_name)
  LOOP
    INSERT INTO public.roles (tenant_id, name, description)
    VALUES (target_tenant_id, default_role.name, default_role.description)
    ON CONFLICT (tenant_id, name)
    DO UPDATE SET description = COALESCE(public.roles.description, EXCLUDED.description)
    RETURNING id INTO created_role_id;

    IF default_role.name = 'Administrateur' THEN
      admin_role_id := created_role_id;
      INSERT INTO public.role_permissions (role_id, permission_id)
      SELECT created_role_id, permission.id
      FROM public.permissions permission
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    ELSE
      INSERT INTO public.role_permissions (role_id, permission_id)
      SELECT created_role_id, template_permission.permission_id
      FROM public.roles template_role
      JOIN public.role_permissions template_permission
        ON template_permission.role_id = template_role.id
      WHERE template_role.tenant_id = target_tenant_id
        AND template_role.name = default_role.template_name
        AND template_role.id <> created_role_id
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
  END LOOP;

  IF first_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET tenant_id = target_tenant_id,
        role_id = admin_role_id
    WHERE id = first_user_id
      AND (tenant_id IS NULL OR tenant_id = target_tenant_id);

    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'Le premier utilisateur est introuvable ou appartient à un autre tenant',
        DETAIL = format('user_id=%s, tenant_id=%s', first_user_id, target_tenant_id),
        HINT = 'Créer le profil sans rôle, puis appeler initialize_tenant_roles avec le même tenant.';
    END IF;
  END IF;

  RETURN admin_role_id;
END
$$;

CREATE OR REPLACE FUNCTION public.tg_initialize_tenant_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.initialize_tenant_roles(NEW.id, NULL);
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_initialize_tenant_roles ON public.tenants;
CREATE TRIGGER trg_initialize_tenant_roles
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.tg_initialize_tenant_roles();

-- Bring existing tenants to the same default-role baseline (notably Gérant).
DO $$
DECLARE
  tenant record;
BEGIN
  FOR tenant IN SELECT id FROM public.tenants LOOP
    PERFORM public.initialize_tenant_roles(tenant.id, NULL);
  END LOOP;
END
$$;

-- New auth users cannot safely receive a global Employé role anymore. Tenant
-- onboarding must pass tenant_id in user metadata; otherwise the profile stays
-- role-less until initialize_tenant_roles(tenant_id, user_id) is called.
CREATE OR REPLACE FUNCTION public.tg_handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_tenant_id uuid;
  default_role_id uuid;
BEGIN
  requested_tenant_id := NULLIF(new.raw_user_meta_data->>'tenant_id', '')::uuid;

  IF requested_tenant_id IS NOT NULL THEN
    PERFORM public.initialize_tenant_roles(requested_tenant_id, NULL);
    SELECT id INTO default_role_id
    FROM public.roles
    WHERE tenant_id = requested_tenant_id
      AND name = 'Employé';
  END IF;

  INSERT INTO public.profiles (
    id, tenant_id, role_id, status, email, full_name, username
  )
  VALUES (
    new.id,
    requested_tenant_id,
    default_role_id,
    'actif',
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'username'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    username = COALESCE(public.profiles.username, EXCLUDED.username);

  RETURN new;
END
$$;

REVOKE ALL ON FUNCTION public.initialize_tenant_roles(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.initialize_tenant_roles(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.initialize_tenant_roles(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_tenant_roles(uuid, uuid) TO service_role;
