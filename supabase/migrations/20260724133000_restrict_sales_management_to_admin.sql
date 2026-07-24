-- Les ventes restent créables et consultables selon le RBAC, mais leur
-- modification et leur suppression sont réservées à l'Administrateur.
-- Cette règle est appliquée au niveau PostgreSQL/RLS, pas seulement dans l'UI.

CREATE OR REPLACE FUNCTION public.has_permission(required_permission text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1
    FROM public.profiles profile
    JOIN public.role_permissions role_permission ON role_permission.role_id = profile.role_id
    JOIN public.permissions permission ON permission.id = role_permission.permission_id
    WHERE profile.id = auth.uid()
      AND permission.code = required_permission
  );
$$;

REVOKE ALL ON public.ventes, public.vente_items FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ventes, public.vente_items TO authenticated;

DROP POLICY IF EXISTS "public rw ventes" ON public.ventes;
DROP POLICY IF EXISTS "ventes_select_authorized" ON public.ventes;
DROP POLICY IF EXISTS "ventes_insert_authorized" ON public.ventes;
DROP POLICY IF EXISTS "ventes_update_admin_only" ON public.ventes;
DROP POLICY IF EXISTS "ventes_delete_admin_only" ON public.ventes;

CREATE POLICY "ventes_select_authorized" ON public.ventes
  FOR SELECT TO authenticated
  USING (public.has_permission('ventes.view'));

CREATE POLICY "ventes_insert_authorized" ON public.ventes
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('ventes.create'));

CREATE POLICY "ventes_update_admin_only" ON public.ventes
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "ventes_delete_admin_only" ON public.ventes
  FOR DELETE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "public rw vente_items" ON public.vente_items;
DROP POLICY IF EXISTS "vente_items_select_authorized" ON public.vente_items;
DROP POLICY IF EXISTS "vente_items_insert_authorized" ON public.vente_items;
DROP POLICY IF EXISTS "vente_items_update_admin_only" ON public.vente_items;
DROP POLICY IF EXISTS "vente_items_delete_admin_only" ON public.vente_items;

CREATE POLICY "vente_items_select_authorized" ON public.vente_items
  FOR SELECT TO authenticated
  USING (public.has_permission('ventes.view'));

CREATE POLICY "vente_items_insert_authorized" ON public.vente_items
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('ventes.create'));

CREATE POLICY "vente_items_update_admin_only" ON public.vente_items
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "vente_items_delete_admin_only" ON public.vente_items
  FOR DELETE TO authenticated
  USING (public.is_admin());
