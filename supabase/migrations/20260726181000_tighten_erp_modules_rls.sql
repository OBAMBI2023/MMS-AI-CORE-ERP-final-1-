CREATE OR REPLACE FUNCTION public.current_user_has_module_assignment(requested_module_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles profile
    JOIN public.tenant_modules tenant_module
      ON tenant_module.tenant_id = profile.tenant_id
    WHERE profile.id = auth.uid()
      AND tenant_module.module_id = requested_module_id
      AND tenant_module.enabled
  );
$$;

DROP POLICY IF EXISTS "erp_modules_read_assigned" ON public.erp_modules;
CREATE POLICY "erp_modules_read_assigned"
  ON public.erp_modules
  FOR SELECT
  TO authenticated
  USING (
    is_active
    AND public.current_user_has_module_assignment(id)
  );

REVOKE ALL ON FUNCTION public.current_user_has_module_assignment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_has_module_assignment(uuid)
  TO authenticated, service_role;
