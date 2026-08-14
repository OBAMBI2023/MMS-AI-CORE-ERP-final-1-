-- Keep one unambiguous PostgREST signature for the session heartbeat.
DROP FUNCTION IF EXISTS public.heartbeat_user_session(text);
DROP FUNCTION IF EXISTS public.heartbeat_user_session(text, boolean);
DROP FUNCTION IF EXISTS public.heartbeat_user_session(text, double precision, double precision);
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
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.active_user_sessions
  SET
    last_seen_at = now(),
    updated_at = now(),
    ended_at = NULL,
    latitude = CASE WHEN p_gps_consent THEN p_latitude ELSE latitude END,
    longitude = CASE WHEN p_gps_consent THEN p_longitude ELSE longitude END,
    location_source = CASE WHEN p_gps_consent THEN 'gps' ELSE location_source END
  WHERE session_id = left(p_session_id, 180)
    AND user_id = auth.uid()
    AND last_seen_at <= now() - interval '60 seconds';
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
