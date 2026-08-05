-- 20260805200000_fix_trial_signup_pack_status_duration.sql reintroduced the
-- current_time bug: it redefined public.consume_trial_signup_attempt (now
-- with the p_phone parameter) using a PL/pgSQL variable named current_time,
-- which collides with the SQL reserved keyword CURRENT_TIME
-- (time with time zone), causing:
--   42804: column "window_started_at" is of type timestamp with time zone
--          but expression is of type time with time zone
-- Renaming the variable to v_now (as already done once for the prior
-- signature) resolves the conflict. No other logic changes.

CREATE OR REPLACE FUNCTION public.consume_trial_signup_attempt(
  p_ip_address text,
  p_email text,
  p_phone text DEFAULT NULL,
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
  phone_key text := md5('phone:' || regexp_replace(COALESCE(p_phone, ''), '[^0-9+]', '', 'g'));
  normalized_phone text := nullif(btrim(COALESCE(p_phone, '')), '');
  v_now timestamptz := clock_timestamp();
  ip_allowed boolean;
  email_allowed boolean;
  phone_allowed boolean := true;
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

  IF normalized_phone IS NOT NULL THEN
    INSERT INTO public.trial_signup_rate_limits (key_hash, window_started_at, attempts)
    VALUES (phone_key, v_now, 1)
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
    RETURNING attempts <= p_max_attempts INTO phone_allowed;
  END IF;

  RETURN ip_allowed AND email_allowed AND phone_allowed;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_trial_signup_attempt(text, text, text, integer, interval)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_trial_signup_attempt(text, text, text, integer, interval)
  TO service_role;
