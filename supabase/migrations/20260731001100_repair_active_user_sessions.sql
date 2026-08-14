-- Repair environments whose migration history contains the connection
-- migrations but whose application session table was not created.
CREATE TABLE IF NOT EXISTS public.active_user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  device text,
  browser text,
  user_agent text,
  ip_masked text,
  country text,
  city text,
  latitude double precision,
  longitude double precision,
  location_source text NOT NULL DEFAULT 'ip'
    CHECK (location_source IN ('ip', 'gps')),
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.active_user_sessions
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_active_user_sessions_last_seen
  ON public.active_user_sessions (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_active_user_sessions_tenant
  ON public.active_user_sessions (tenant_id, last_seen_at DESC);
ALTER TABLE public.active_user_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users maintain own active session"
  ON public.active_user_sessions;
CREATE POLICY "Users maintain own active session"
  ON public.active_user_sessions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Tenant admins read tenant active sessions"
  ON public.active_user_sessions;
CREATE POLICY "Tenant admins read tenant active sessions"
  ON public.active_user_sessions FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_admin());
DROP POLICY IF EXISTS "Platform admins read all active sessions"
  ON public.active_user_sessions;
CREATE POLICY "Platform admins read all active sessions"
  ON public.active_user_sessions FOR SELECT TO authenticated
  USING (public.is_platform_admin_actor(auth.uid()));
DROP POLICY IF EXISTS "Security actors read all active sessions"
  ON public.active_user_sessions;
CREATE POLICY "Security actors read all active sessions"
  ON public.active_user_sessions FOR SELECT TO authenticated
  USING (public.has_connection_security_permission('connections.view'));
-- Preserve the security-aware heartbeat signature and ensure revoked or ended
-- sessions cannot be revived after repairing the table.
DROP FUNCTION IF EXISTS public.heartbeat_user_session(
  text,
  double precision,
  double precision,
  boolean
);
CREATE FUNCTION public.heartbeat_user_session(
  p_session_id text,
  p_latitude double precision,
  p_longitude double precision,
  p_gps_consent boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE session_allowed boolean;
BEGIN
  SELECT session.revoked_at IS NULL
      AND session.ended_at IS NULL
      AND profile.status = 'actif'
    INTO session_allowed
  FROM public.active_user_sessions session
  JOIN public.profiles profile ON profile.id = session.user_id
  WHERE session.session_id = left(p_session_id, 180)
    AND session.user_id = auth.uid();

  IF coalesce(session_allowed, false) = false THEN RETURN false; END IF;

  UPDATE public.active_user_sessions
  SET
    last_seen_at = now(),
    updated_at = now(),
    latitude = CASE WHEN p_gps_consent THEN p_latitude ELSE latitude END,
    longitude = CASE WHEN p_gps_consent THEN p_longitude ELSE longitude END,
    location_source = CASE WHEN p_gps_consent THEN 'gps' ELSE location_source END
  WHERE session_id = left(p_session_id, 180)
    AND user_id = auth.uid()
    AND revoked_at IS NULL
    AND ended_at IS NULL
    AND last_seen_at <= now() - interval '60 seconds';

  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.heartbeat_user_session(
  text,
  double precision,
  double precision,
  boolean
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.heartbeat_user_session(
  text,
  double precision,
  double precision,
  boolean
) TO authenticated;
NOTIFY pgrst, 'reload schema';
