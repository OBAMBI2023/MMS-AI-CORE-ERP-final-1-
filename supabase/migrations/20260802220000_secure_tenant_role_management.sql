ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_roles_tenant_active ON public.roles (tenant_id, is_active);

CREATE OR REPLACE FUNCTION public.protect_tenant_administrator_role()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.name = 'Administrateur' AND (TG_OP = 'DELETE' OR NEW.name IS DISTINCT FROM OLD.name OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id OR NEW.is_active IS NOT TRUE) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Le rôle Administrateur est protégé';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
DROP TRIGGER IF EXISTS trg_protect_tenant_administrator_role ON public.roles;
CREATE TRIGGER trg_protect_tenant_administrator_role BEFORE UPDATE OR DELETE ON public.roles
FOR EACH ROW EXECUTE FUNCTION public.protect_tenant_administrator_role();

CREATE OR REPLACE FUNCTION public.grant_permission_to_tenant_admins()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT id, NEW.id FROM public.roles WHERE name = 'Administrateur'
  ON CONFLICT (role_id, permission_id) DO NOTHING;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_grant_permission_to_tenant_admins ON public.permissions;
CREATE TRIGGER trg_grant_permission_to_tenant_admins AFTER INSERT ON public.permissions
FOR EACH ROW EXECUTE FUNCTION public.grant_permission_to_tenant_admins();

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role.id, permission.id FROM public.roles role CROSS JOIN public.permissions permission
WHERE role.name = 'Administrateur' ON CONFLICT (role_id, permission_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.protect_administrator_permissions()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.roles WHERE id = OLD.role_id AND name = 'Administrateur') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Les permissions Administrateur sont protégées';
  END IF;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS trg_protect_administrator_permissions ON public.role_permissions;
CREATE TRIGGER trg_protect_administrator_permissions BEFORE DELETE ON public.role_permissions
FOR EACH ROW EXECUTE FUNCTION public.protect_administrator_permissions();
