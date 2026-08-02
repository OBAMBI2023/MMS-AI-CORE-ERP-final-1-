-- Restore self-profile reads for global accounts without weakening tenant
-- administration. PostgreSQL NULL equality made the previous policy hide a
-- platform administrator's own profile when tenant_id was NULL.
DROP POLICY IF EXISTS "profiles_read_own_or_tenant_admin" ON public.profiles;
CREATE POLICY "profiles_read_own_or_tenant_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR (
      tenant_id = public.current_tenant_id()
      AND public.is_admin()
    )
  );

-- Keep own-profile updates tenant-only. Platform administrators do not need a
-- tenant profile and receive no implicit tenant write capability.
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = id
    AND tenant_id IS NOT NULL
    AND tenant_id = public.current_tenant_id()
  )
  WITH CHECK (
    auth.uid() = id
    AND tenant_id IS NOT NULL
    AND tenant_id = public.current_tenant_id()
  );
