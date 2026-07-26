-- The sales RBAC policies predate tenant isolation. PostgreSQL combines
-- permissive policies with OR, so those legacy policies must also include the
-- tenant predicate; adding a second tenant policy alone is not sufficient.

DROP POLICY IF EXISTS "tenant isolation ventes" ON public.ventes;
DROP POLICY IF EXISTS "ventes_select_authorized" ON public.ventes;
DROP POLICY IF EXISTS "ventes_insert_authorized" ON public.ventes;
DROP POLICY IF EXISTS "ventes_update_admin_only" ON public.ventes;
DROP POLICY IF EXISTS "ventes_delete_admin_only" ON public.ventes;

CREATE POLICY "ventes_select_authorized" ON public.ventes
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.has_permission('ventes.view')
  );

CREATE POLICY "ventes_insert_authorized" ON public.ventes
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.has_permission('ventes.create')
  );

CREATE POLICY "ventes_update_admin_only" ON public.ventes
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.is_admin()
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.is_admin()
  );

CREATE POLICY "ventes_delete_admin_only" ON public.ventes
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.is_admin()
  );
