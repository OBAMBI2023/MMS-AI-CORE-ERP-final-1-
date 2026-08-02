-- Allow tenant administrators to manage custom roles while retaining strict
-- tenant ownership and self-role-change protections.
ALTER TABLE public.roles
  DROP CONSTRAINT IF EXISTS roles_tenant_role_name_check;

CREATE OR REPLACE FUNCTION public.validate_profile_role_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_role public.roles%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' AND auth.uid() = OLD.id
     AND (NEW.role_id IS DISTINCT FROM OLD.role_id
       OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Un utilisateur ne peut pas modifier son propre rôle ou tenant_id';
  END IF;

  IF NEW.role_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO selected_role
  FROM public.roles role
  WHERE role.id = NEW.role_id;

  IF NOT FOUND
     OR selected_role.tenant_id IS DISTINCT FROM NEW.tenant_id
     OR selected_role.is_active IS NOT TRUE THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'Attribution de rôle refusée',
      DETAIL = format('profile_id=%s, tenant_id=%s, role_id=%s',
        NEW.id, NEW.tenant_id, NEW.role_id);
  END IF;

  RETURN NEW;
END
$$;

-- Replace the legacy globally writable settings policy with tenant-scoped
-- access. Writes additionally require the permission used by the route guard.
DROP POLICY IF EXISTS "public rw parametres" ON public.parametres;
DROP POLICY IF EXISTS "tenant_parametres_select" ON public.parametres;
DROP POLICY IF EXISTS "tenant_parametres_insert" ON public.parametres;
DROP POLICY IF EXISTS "tenant_parametres_update" ON public.parametres;
DROP POLICY IF EXISTS "tenant_parametres_delete" ON public.parametres;

CREATE POLICY "tenant_parametres_select" ON public.parametres
FOR SELECT TO authenticated
USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_parametres_insert" ON public.parametres
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.current_tenant_id()
  AND public.has_permission('settings.manage')
);

CREATE POLICY "tenant_parametres_update" ON public.parametres
FOR UPDATE TO authenticated
USING (
  tenant_id = public.current_tenant_id()
  AND public.has_permission('settings.manage')
)
WITH CHECK (
  tenant_id = public.current_tenant_id()
  AND public.has_permission('settings.manage')
);

CREATE POLICY "tenant_parametres_delete" ON public.parametres
FOR DELETE TO authenticated
USING (
  tenant_id = public.current_tenant_id()
  AND public.has_permission('settings.manage')
);
