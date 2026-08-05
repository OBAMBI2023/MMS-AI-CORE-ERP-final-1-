-- RLS and tenant RPCs must reject authenticated recovery users and inactive
-- profiles just as the application guards do. A bare auth.uid() is insufficient.
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT profile.tenant_id
  FROM public.profiles profile
  WHERE profile.id = auth.uid()
    AND profile.status = 'active'
    AND profile.role_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.roles role
      WHERE role.id = profile.role_id
        AND role.tenant_id = profile.tenant_id
    )
    AND public.tenant_has_current_access(profile.tenant_id)
$$;

REVOKE ALL ON FUNCTION public.current_tenant_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO authenticated, service_role;
