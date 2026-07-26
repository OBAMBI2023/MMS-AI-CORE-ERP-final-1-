-- Allow an authenticated user to read only the tenant referenced by their
-- own profile. Other tenants remain invisible through RLS.
DROP POLICY IF EXISTS "tenants_read_own_profile_tenant" ON public.tenants;

CREATE POLICY "tenants_read_own_profile_tenant"
ON public.tenants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = tenants.id
  )
);
