-- Generate and reserve tenant slugs exclusively on the trusted database side.

CREATE OR REPLACE FUNCTION public.normalize_tenant_slug(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(
      trim(BOTH '-' FROM regexp_replace(
        regexp_replace(
          lower(translate(
            btrim(p_name),
            'ÀÁÂÃÄÅàáâãäåÇçÈÉÊËèéêëÌÍÎÏìíîïÑñÒÓÔÕÖØòóôõöøÙÚÛÜùúûüÝŸýÿÆæŒœ',
            'AAAAAAaaaaaaCcEEEEeeeeIIIIiiiiNnOOOOOOooooooUUUUuuuuYYyyAaOo'
          )),
          '[^a-z0-9]+',
          '-',
          'g'
        ),
        '-+',
        '-',
        'g'
      )),
      ''
    ),
    'tenant'
  );
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT slug
    FROM public.tenants
    GROUP BY slug
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Impossible de garantir l''unicité : des slugs de tenants sont déjà dupliqués';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_key
  ON public.tenants (slug);

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
  existing_tenant_id uuid;
  auth_email text;
  base_slug text;
  candidate_slug text;
  slug_suffix integer := 1;
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

  -- Serialize onboarding attempts for one auth user. A retry can therefore
  -- never create a second tenant for the same signup.
  SELECT tenant_id INTO existing_tenant_id
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Le profil administrateur est introuvable';
  END IF;

  IF existing_tenant_id IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = 'Un espace existe déjà pour ce compte';
  END IF;

  base_slug := public.normalize_tenant_slug(p_company_name);
  candidate_slug := base_slug;

  LOOP
    BEGIN
      INSERT INTO public.tenants (name, slug)
      VALUES (btrim(p_company_name), candidate_slug)
      RETURNING id INTO created_tenant_id;
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        slug_suffix := slug_suffix + 1;
        IF slug_suffix > 1000 THEN
          RAISE EXCEPTION USING
            ERRCODE = '23505',
            MESSAGE = 'Impossible de réserver un identifiant unique pour l''entreprise';
        END IF;
        candidate_slug := base_slug || '-' || slug_suffix::text;
    END;
  END LOOP;

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

REVOKE ALL ON FUNCTION public.normalize_tenant_slug(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.normalize_tenant_slug(text) FROM anon;
REVOKE ALL ON FUNCTION public.normalize_tenant_slug(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_tenant_slug(text) TO service_role;

REVOKE ALL ON FUNCTION public.create_trial_workspace(uuid, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_trial_workspace(uuid, text, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.create_trial_workspace(uuid, text, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_trial_workspace(uuid, text, text, text, text) TO service_role;
