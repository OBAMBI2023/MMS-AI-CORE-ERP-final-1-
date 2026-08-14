-- Security operations for the global connection console. These controls only
-- update application-owned profiles and session telemetry; Supabase Auth is
-- intentionally left untouched.
-- Keep this migration safe when an environment has recorded the preceding
-- connection migrations without actually creating their session table.
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
CREATE INDEX IF NOT EXISTS idx_active_user_sessions_last_seen
  ON public.active_user_sessions (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_active_user_sessions_tenant
  ON public.active_user_sessions (tenant_id, last_seen_at DESC);
ALTER TABLE public.active_user_sessions ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.platform_security_role_assignments (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role_name text NOT NULL CHECK (role_name = 'Responsable Sécurité'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.platform_security_role_permissions (
  role_name text NOT NULL CHECK (role_name = 'Responsable Sécurité'),
  permission_code text NOT NULL CHECK (permission_code IN (
    'connections.view',
    'connections.end_session',
    'connections.end_all',
    'connections.suspend_user',
    'connections.reactivate_user',
    'connections.flag_suspicious'
  )),
  PRIMARY KEY (role_name, permission_code)
);
INSERT INTO public.platform_security_role_permissions (role_name, permission_code) VALUES
  ('Responsable Sécurité', 'connections.view'),
  ('Responsable Sécurité', 'connections.end_session'),
  ('Responsable Sécurité', 'connections.end_all'),
  ('Responsable Sécurité', 'connections.suspend_user'),
  ('Responsable Sécurité', 'connections.reactivate_user'),
  ('Responsable Sécurité', 'connections.flag_suspicious')
ON CONFLICT DO NOTHING;
ALTER TABLE public.platform_security_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_security_role_permissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_security_role_assignments FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.platform_security_role_permissions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.platform_security_role_assignments TO authenticated;
GRANT SELECT ON public.platform_security_role_permissions TO authenticated;
GRANT ALL ON public.platform_security_role_assignments TO service_role;
GRANT ALL ON public.platform_security_role_permissions TO service_role;
DROP POLICY IF EXISTS "security_assignments_read_own" ON public.platform_security_role_assignments;
CREATE POLICY "security_assignments_read_own"
  ON public.platform_security_role_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "security_permissions_read_assigned" ON public.platform_security_role_permissions;
CREATE POLICY "security_permissions_read_assigned"
  ON public.platform_security_role_permissions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.platform_security_role_assignments assignment
    WHERE assignment.user_id = auth.uid()
      AND assignment.role_name = platform_security_role_permissions.role_name
  ));
ALTER TABLE public.active_user_sessions
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.connection_logs
  ADD COLUMN IF NOT EXISTS is_suspicious boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspicious_marked_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspicious_marked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE OR REPLACE FUNCTION public.has_connection_security_permission(requested_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_platform_admin_actor(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.platform_security_role_assignments assignment
      JOIN public.platform_security_role_permissions permission
        ON permission.role_name = assignment.role_name
      WHERE assignment.user_id = auth.uid()
        AND permission.permission_code = requested_permission
    )
$$;
DROP POLICY IF EXISTS "Security actors read all connection logs" ON public.connection_logs;
CREATE POLICY "Security actors read all connection logs" ON public.connection_logs
  FOR SELECT TO authenticated
  USING (public.has_connection_security_permission('connections.view'));
DROP POLICY IF EXISTS "Security actors read all active sessions" ON public.active_user_sessions;
CREATE POLICY "Security actors read all active sessions" ON public.active_user_sessions
  FOR SELECT TO authenticated
  USING (public.has_connection_security_permission('connections.view'));
CREATE OR REPLACE FUNCTION public.manage_user_connection_security(
  requested_action text,
  requested_user_id uuid,
  requested_session_id text DEFAULT NULL,
  requested_connection_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE required_permission text;
BEGIN
  required_permission := CASE requested_action
    WHEN 'end_session' THEN 'connections.end_session'
    WHEN 'end_all' THEN 'connections.end_all'
    WHEN 'suspend_user' THEN 'connections.suspend_user'
    WHEN 'reactivate_user' THEN 'connections.reactivate_user'
    WHEN 'flag_suspicious' THEN 'connections.flag_suspicious'
    ELSE NULL
  END;
  IF required_permission IS NULL THEN RAISE EXCEPTION 'Action de sécurité inconnue'; END IF;
  IF NOT public.has_connection_security_permission(required_permission) THEN
    RAISE EXCEPTION 'Permission de sécurité requise';
  END IF;

  IF requested_action = 'end_session' THEN
    UPDATE public.active_user_sessions
    SET ended_at = now(), revoked_at = now(), revoked_by = auth.uid(), updated_at = now()
    WHERE user_id = requested_user_id
      AND session_id = left(requested_session_id, 180);
  ELSIF requested_action = 'end_all' THEN
    UPDATE public.active_user_sessions
    SET ended_at = now(), revoked_at = now(), revoked_by = auth.uid(), updated_at = now()
    WHERE user_id = requested_user_id AND revoked_at IS NULL;
  ELSIF requested_action = 'suspend_user' THEN
    UPDATE public.profiles SET status = 'suspendu' WHERE id = requested_user_id;
    UPDATE public.active_user_sessions
    SET ended_at = now(), revoked_at = now(), revoked_by = auth.uid(), updated_at = now()
    WHERE user_id = requested_user_id AND revoked_at IS NULL;
  ELSIF requested_action = 'reactivate_user' THEN
    UPDATE public.profiles SET status = 'actif' WHERE id = requested_user_id;
  ELSE
    UPDATE public.connection_logs
    SET is_suspicious = true, suspicious_marked_at = now(), suspicious_marked_by = auth.uid()
    WHERE id = requested_connection_id AND user_id = requested_user_id;
  END IF;

  INSERT INTO public.audit_logs (user_id, action, module, metadata)
  VALUES (
    auth.uid(), requested_action, 'super_admin_connections',
    jsonb_build_object(
      'targetUserId', requested_user_id,
      'sessionId', requested_session_id,
      'connectionId', requested_connection_id
    )
  );
END;
$$;
REVOKE ALL ON FUNCTION public.has_connection_security_permission(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.manage_user_connection_security(text,uuid,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_connection_security_permission(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.manage_user_connection_security(text,uuid,text,uuid) TO authenticated;
-- A revoked application session can no longer be revived by its heartbeat.
DROP FUNCTION IF EXISTS public.heartbeat_user_session(text, double precision, double precision, boolean);
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
REVOKE ALL ON FUNCTION public.heartbeat_user_session(text,double precision,double precision,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.heartbeat_user_session(text,double precision,double precision,boolean) TO authenticated;
NOTIFY pgrst, 'reload schema';
