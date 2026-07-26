-- Atomic tenant onboarding for the public three-day free trial.
-- Auth users are created by the trusted server before this function is called;
-- all public-schema writes below share the RPC transaction.

CREATE OR REPLACE FUNCTION public.create_tenant_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (
    tenant_id, trial_started_at, trial_ends_at, amount, billing_cycle, status
  )
  VALUES (
    NEW.id, now(), now() + interval '3 days', 0, 'monthly', 'trial'
  )
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_trial_workspace(
  p_user_id uuid,
  p_company_name text,
  p_full_name text,
  p_email text,
  p_phone text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  created_tenant_id uuid;
  auth_email text;
BEGIN
  IF btrim(COALESCE(p_company_name, '')) = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Le nom de l''entreprise est requis';
  END IF;

  IF btrim(COALESCE(p_full_name, '')) = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Le nom complet est requis';
  END IF;

  SELECT email INTO auth_email
  FROM auth.users
  WHERE id = p_user_id;

  IF auth_email IS NULL OR lower(auth_email) <> lower(btrim(p_email)) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Le compte utilisateur est invalide';
  END IF;

  INSERT INTO public.tenants (name)
  VALUES (btrim(p_company_name))
  RETURNING id INTO created_tenant_id;

  UPDATE public.profiles
  SET
    tenant_id = created_tenant_id,
    full_name = btrim(p_full_name),
    email = lower(btrim(p_email)),
    phone = btrim(p_phone),
    status = 'actif'
  WHERE id = p_user_id
    AND tenant_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Le profil administrateur n''a pas pu être créé';
  END IF;

  PERFORM public.initialize_tenant_roles(created_tenant_id, p_user_id);

  -- The tenant trigger creates this row. Updating explicitly makes the
  -- onboarding contract independent from a previously deployed trigger body.
  UPDATE public.subscriptions
  SET
    status = 'trial',
    trial_started_at = now(),
    trial_ends_at = now() + interval '3 days',
    starts_at = NULL,
    ends_at = NULL,
    amount = 0
  WHERE tenant_id = created_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'La licence d''essai n''a pas pu être créée';
  END IF;

  RETURN created_tenant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_trial_workspace(uuid, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_trial_workspace(uuid, text, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.create_trial_workspace(uuid, text, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_trial_workspace(uuid, text, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.rollback_trial_workspace(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO target_tenant_id
  FROM public.profiles
  WHERE id = p_user_id;

  IF target_tenant_id IS NULL THEN
    RETURN true;
  END IF;

  DELETE FROM public.profiles WHERE id = p_user_id;
  DELETE FROM public.roles WHERE tenant_id = target_tenant_id;
  DELETE FROM public.tenants WHERE id = target_tenant_id;
  RETURN NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = target_tenant_id);
END;
$$;

REVOKE ALL ON FUNCTION public.rollback_trial_workspace(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rollback_trial_workspace(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.rollback_trial_workspace(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_trial_workspace(uuid) TO service_role;

CREATE TABLE IF NOT EXISTS public.trial_signup_rate_limits (
  key_hash text PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  attempts integer NOT NULL CHECK (attempts > 0)
);

ALTER TABLE public.trial_signup_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.trial_signup_rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trial_signup_rate_limits TO service_role;

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
  current_time timestamptz := clock_timestamp();
  ip_allowed boolean;
  email_allowed boolean;
BEGIN
  INSERT INTO public.trial_signup_rate_limits (key_hash, window_started_at, attempts)
  VALUES (ip_key, current_time, 1)
  ON CONFLICT (key_hash) DO UPDATE SET
    window_started_at = CASE
      WHEN public.trial_signup_rate_limits.window_started_at + p_window <= current_time
        THEN current_time
      ELSE public.trial_signup_rate_limits.window_started_at
    END,
    attempts = CASE
      WHEN public.trial_signup_rate_limits.window_started_at + p_window <= current_time
        THEN 1
      ELSE public.trial_signup_rate_limits.attempts + 1
    END
  RETURNING attempts <= p_max_attempts INTO ip_allowed;

  INSERT INTO public.trial_signup_rate_limits (key_hash, window_started_at, attempts)
  VALUES (email_key, current_time, 1)
  ON CONFLICT (key_hash) DO UPDATE SET
    window_started_at = CASE
      WHEN public.trial_signup_rate_limits.window_started_at + p_window <= current_time
        THEN current_time
      ELSE public.trial_signup_rate_limits.window_started_at
    END,
    attempts = CASE
      WHEN public.trial_signup_rate_limits.window_started_at + p_window <= current_time
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
