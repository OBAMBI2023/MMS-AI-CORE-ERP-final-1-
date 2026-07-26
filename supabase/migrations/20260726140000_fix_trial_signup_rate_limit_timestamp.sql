-- Fix consume_trial_signup_attempt using the SQL keyword CURRENT_TIME
-- (time with time zone) instead of the intended PL/pgSQL timestamp variable.

CREATE OR REPLACE FUNCTION public.consume_trial_signup_attempt(
  p_ip_address text,
  p_email text,
  p_max_attempts integer DEFAULT 5,
  p_window interval DEFAULT interval '1 hour'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ip_key text := md5('ip:' || COALESCE(p_ip_address, 'unknown'));
  email_key text := md5('email:' || lower(btrim(COALESCE(p_email, ''))));
  v_now timestamptz := CURRENT_TIMESTAMP;
  ip_allowed boolean;
  email_allowed boolean;
BEGIN
  INSERT INTO public.trial_signup_rate_limits (key_hash, window_started_at, attempts)
  VALUES (ip_key, v_now, 1)
  ON CONFLICT (key_hash) DO UPDATE SET
    window_started_at = CASE
      WHEN public.trial_signup_rate_limits.window_started_at + p_window <= v_now
        THEN v_now
      ELSE public.trial_signup_rate_limits.window_started_at
    END,
    attempts = CASE
      WHEN public.trial_signup_rate_limits.window_started_at + p_window <= v_now
        THEN 1
      ELSE public.trial_signup_rate_limits.attempts + 1
    END
  RETURNING attempts <= p_max_attempts INTO ip_allowed;

  INSERT INTO public.trial_signup_rate_limits (key_hash, window_started_at, attempts)
  VALUES (email_key, v_now, 1)
  ON CONFLICT (key_hash) DO UPDATE SET
    window_started_at = CASE
      WHEN public.trial_signup_rate_limits.window_started_at + p_window <= v_now
        THEN v_now
      ELSE public.trial_signup_rate_limits.window_started_at
    END,
    attempts = CASE
      WHEN public.trial_signup_rate_limits.window_started_at + p_window <= v_now
        THEN 1
      ELSE public.trial_signup_rate_limits.attempts + 1
    END
  RETURNING attempts <= p_max_attempts INTO email_allowed;

  RETURN ip_allowed AND email_allowed;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_trial_signup_attempt(text, text, integer, interval) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_trial_signup_attempt(text, text, integer, interval) FROM anon;
REVOKE ALL ON FUNCTION public.consume_trial_signup_attempt(text, text, integer, interval) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.consume_trial_signup_attempt(text, text, integer, interval) TO service_role;
