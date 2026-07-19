-- ============================================================================
-- Authentification & RBAC — Professional ERP Setup (Production Hardened)
-- ============================================================================

-- 1. Roles (Évolutifs)
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Permissions
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id uuid REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- 3. Profiles (Lié à auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  full_name text,
  phone text,
  avatar_url text,
  role_id uuid REFERENCES public.roles(id) ON DELETE SET NULL,
  status text DEFAULT 'actif' CHECK (status IN ('actif', 'suspendu', 'archivé')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON public.profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions(permission_id);

-- 4. Trigger Function: Set Updated At
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_upd ON public.profiles;
CREATE TRIGGER trg_profiles_upd BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 5. Helper Function: Is Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid() AND r.name = 'Administrateur'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger Function: Sync Auth User to Profile
CREATE OR REPLACE FUNCTION public.tg_handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role_id uuid;
BEGIN
  SELECT id INTO default_role_id FROM public.roles WHERE name = 'Employé';
  INSERT INTO public.profiles (id, role_id, status)
  VALUES (new.id, default_role_id, 'actif')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.tg_handle_new_user();

-- 7. Seeds (Idempotent)
INSERT INTO public.roles (name, description) VALUES
  ('Administrateur', 'Accès total à tous les modules'),
  ('Manager', 'Gestion des ventes, achats, dépenses et rapports'),
  ('Caissier', 'Gestion exclusive des ventes POS'),
  ('Commercial', 'Gestion des devis et clients'),
  ('Comptable', 'Gestion des dépenses et rapports financiers'),
  ('Employé', 'Accès limité (lecture seulement)')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.permissions (code, description) VALUES
  ('dashboard.view', 'Voir le tableau de bord'),
  ('ventes.view', 'Voir les ventes'),
  ('ventes.create', 'Créer une vente'),
  ('ventes.delete', 'Supprimer une vente'),
  ('achats.view', 'Voir les achats'),
  ('clients.view', 'Voir les clients'),
  ('assistant.use', 'Utiliser l''assistant IA'),
  ('settings.manage', 'Gérer les paramètres')
ON CONFLICT (code) DO NOTHING;

-- 8. RLS Policies
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: Own + Admin
DROP POLICY IF EXISTS "profiles_read_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_read_own_or_admin" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Admins: Full access to RBAC tables
DROP POLICY IF EXISTS "admin_all_access_roles" ON public.roles;
CREATE POLICY "admin_all_access_roles" ON public.roles FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "admin_all_access_perms" ON public.permissions;
CREATE POLICY "admin_all_access_perms" ON public.permissions FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "admin_all_access_role_perms" ON public.role_permissions;
CREATE POLICY "admin_all_access_role_perms" ON public.role_permissions FOR ALL USING (public.is_admin());
