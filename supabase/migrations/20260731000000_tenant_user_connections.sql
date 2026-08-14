-- Keep only successful, tenant-scoped user connections.
ALTER TABLE public.connection_logs
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS device text,
  ADD COLUMN IF NOT EXISTS browser text,
  ADD COLUMN IF NOT EXISTS user_agent text;
DELETE FROM public.connection_logs WHERE status <> 'success' OR user_id IS NULL;
UPDATE public.connection_logs log
SET tenant_id = profile.tenant_id
FROM public.profiles profile
WHERE profile.id = log.user_id
  AND log.tenant_id IS NULL;
DELETE FROM public.connection_logs WHERE tenant_id IS NULL;
ALTER TABLE public.connection_logs
  DROP CONSTRAINT IF EXISTS connection_logs_user_id_fkey;
ALTER TABLE public.connection_logs
  ADD CONSTRAINT connection_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.connection_logs
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'success';
ALTER TABLE public.connection_logs
  DROP CONSTRAINT IF EXISTS connection_logs_status_check;
ALTER TABLE public.connection_logs
  ADD CONSTRAINT connection_logs_status_check CHECK (status = 'success');
CREATE INDEX IF NOT EXISTS idx_connection_logs_tenant_created_at
  ON public.connection_logs (tenant_id, created_at DESC);
DROP POLICY IF EXISTS "Admins can view logs" ON public.connection_logs;
DROP POLICY IF EXISTS "Tenant admins can view connection logs" ON public.connection_logs;
CREATE POLICY "Tenant admins can view connection logs"
  ON public.connection_logs FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_admin());
DROP FUNCTION IF EXISTS public.log_connection_attempt(text, text, uuid);
CREATE FUNCTION public.log_connection_attempt(
  p_email text,
  p_status text,
  p_user_id uuid DEFAULT NULL,
  p_device text DEFAULT NULL,
  p_browser text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_tenant_id uuid;
BEGIN
  -- Authentication failures and non-login activity are deliberately ignored.
  IF p_status <> 'success' OR p_user_id IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN;
  END IF;

  SELECT tenant_id INTO actor_tenant_id
  FROM public.profiles
  WHERE id = auth.uid();

  -- Platform/partner identities do not belong to a tenant connection history.
  IF actor_tenant_id IS NULL THEN
    RETURN;
  END IF;

  -- Serialize simultaneous logins for the same tenant so the cap remains exact.
  PERFORM pg_advisory_xact_lock(hashtextextended(actor_tenant_id::text, 0));

  INSERT INTO public.connection_logs (
    user_id, tenant_id, email, status, device, browser, user_agent
  ) VALUES (
    auth.uid(), actor_tenant_id, p_email, 'success',
    NULLIF(left(p_device, 100), ''),
    NULLIF(left(p_browser, 100), ''),
    NULLIF(left(p_user_agent, 1000), '')
  );

  DELETE FROM public.connection_logs old_log
  WHERE old_log.tenant_id = actor_tenant_id
    AND old_log.id NOT IN (
      SELECT kept.id
      FROM public.connection_logs kept
      WHERE kept.tenant_id = actor_tenant_id
      ORDER BY kept.created_at DESC, kept.id DESC
      LIMIT 10
    );
END;
$$;
REVOKE ALL ON FUNCTION public.log_connection_attempt(text, text, uuid, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_connection_attempt(text, text, uuid, text, text, text)
  TO authenticated;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'connection_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.connection_logs;
  END IF;
END
$$;
