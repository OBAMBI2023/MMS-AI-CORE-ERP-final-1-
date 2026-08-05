-- Public trial signup (/essai-gratuit) fixes:
--   1. profiles.status must use the canonicalized English values ('active'),
--      not the legacy French 'actif' rejected by profiles_status_check since
--      20260731120000_canonicalize_profile_status_and_session_revocation.sql.
--      Without this fix, every public trial signup currently fails.
--   2. The advertised trial length is 7 days; create_trial_workspace was
--      overwriting the tenant's subscription with a 3-day window.
--   3. Every new trial now gets an explicit "Pack Commerce générale" module
--      assignment instead of an implicit "enable everything" default, so the
--      set of enabled modules is intentional and testable.
--   4. tenants.platform_type and tenants.signup_activity are introduced so a
--      future HOTEL experience can be added without another schema change;
--      every trial is provisioned as platform_type = 'ERP' for now.
--   5. consume_trial_signup_attempt also rate-limits by phone number, closing
--      the gap where only IP/email were protected against repeated trials.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS platform_type text NOT NULL DEFAULT 'ERP',
  ADD COLUMN IF NOT EXISTS signup_activity text;

ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_platform_type_check;
ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_platform_type_check CHECK (platform_type IN ('ERP', 'HOTEL'));

-- "Pack Commerce générale" mirrors the modules every trial tenant already
-- receives today (all active modules except the opt-in AI assistant), so
-- switching signup to an explicit pack assignment changes nothing observable.
INSERT INTO public.module_packs (name, code, description)
VALUES (
  'Pack Commerce générale',
  'commerce_generale',
  'Modules activés automatiquement pour tous les nouveaux essais gratuits ERP.'
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.module_pack_items (pack_id, module_id)
SELECT pack.id, module.id
FROM public.module_packs pack
JOIN public.erp_modules module
  ON module.is_active AND module.code <> 'ai_assistant'
WHERE pack.code = 'commerce_generale'
ON CONFLICT DO NOTHING;

DROP FUNCTION IF EXISTS public.create_trial_workspace(uuid, text, text, text, text);

CREATE FUNCTION public.create_trial_workspace(
  p_user_id uuid,
  p_company_name text,
  p_full_name text,
  p_email text,
  p_phone text,
  p_activity text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  created_tenant_id uuid;
  created_slug text;
  existing_tenant_id uuid;
  auth_email text;
  commerce_generale_pack_id uuid;
  normalized_activity text := nullif(btrim(COALESCE(p_activity, '')), '');
  -- Every public trial is provisioned as the generic ERP workspace today, even
  -- for hôtel-related activities. normalized_activity is persisted so a future
  -- HOTEL platform_type / dedicated pack can be resolved from it right here
  -- without changing this function's signature or callers again.
  resolved_platform_type CONSTANT text := 'ERP';
BEGIN
  IF btrim(COALESCE(p_company_name, '')) = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Le nom de l''entreprise est requis';
  END IF;

  IF length(btrim(p_company_name)) > 120 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Le nom de l''entreprise est trop long';
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

  SELECT tenant_id INTO existing_tenant_id
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Le profil administrateur est introuvable';
  END IF;

  IF existing_tenant_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Un espace existe déjà pour ce compte';
  END IF;

  SELECT id INTO commerce_generale_pack_id
  FROM public.module_packs
  WHERE code = 'commerce_generale' AND is_active;

  IF commerce_generale_pack_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Le pack Commerce générale est introuvable';
  END IF;

  -- No slug is accepted as input: the BEFORE INSERT trigger creates it.
  INSERT INTO public.tenants (name, platform_type, signup_activity)
  VALUES (btrim(p_company_name), resolved_platform_type, normalized_activity)
  RETURNING id, slug INTO created_tenant_id, created_slug;

  UPDATE public.profiles
  SET tenant_id = created_tenant_id,
      full_name = btrim(p_full_name),
      email = lower(btrim(p_email)),
      phone = btrim(p_phone),
      status = 'active'
  WHERE id = p_user_id
    AND tenant_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Le profil administrateur n''a pas pu être créé';
  END IF;

  PERFORM public.initialize_tenant_roles(created_tenant_id, p_user_id);

  PERFORM public.assign_module_pack_to_tenant(
    created_tenant_id, commerce_generale_pack_id, p_user_id
  );

  UPDATE public.subscriptions
  SET status = 'trial',
      trial_started_at = now(),
      trial_ends_at = now() + interval '7 days',
      starts_at = NULL,
      ends_at = NULL,
      amount = 0
  WHERE tenant_id = created_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'La licence d''essai n''a pas pu être créée';
  END IF;

  RETURN jsonb_build_object(
    'tenantId', created_tenant_id,
    'slug', created_slug,
    'platformType', resolved_platform_type,
    'loginUrl', '/login/' || created_slug
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_trial_workspace(uuid, text, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_trial_workspace(uuid, text, text, text, text, text)
  TO service_role;

DROP FUNCTION IF EXISTS public.consume_trial_signup_attempt(text, text, integer, interval);

CREATE FUNCTION public.consume_trial_signup_attempt(
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
  current_time timestamptz := clock_timestamp();
  ip_allowed boolean;
  email_allowed boolean;
  phone_allowed boolean := true;
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

  IF normalized_phone IS NOT NULL THEN
    INSERT INTO public.trial_signup_rate_limits (key_hash, window_started_at, attempts)
    VALUES (phone_key, current_time, 1)
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
    RETURNING attempts <= p_max_attempts INTO phone_allowed;
  END IF;

  RETURN ip_allowed AND email_allowed AND phone_allowed;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_trial_signup_attempt(text, text, text, integer, interval)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_trial_signup_attempt(text, text, text, integer, interval)
  TO service_role;
