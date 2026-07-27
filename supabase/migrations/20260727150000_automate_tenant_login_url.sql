-- Make the database the single authority for tenant slugs.
-- Existing non-empty slugs are intentionally left untouched.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS slug text;

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
        lower(translate(
          btrim(p_name),
          'ÀÁÂÃÄÅàáâãäåÇçÈÉÊËèéêëÌÍÎÏìíîïÑñÒÓÔÕÖØòóôõöøÙÚÛÜùúûüÝŸýÿÆæŒœ',
          'AAAAAAaaaaaaCcEEEEeeeeIIIIiiiiNnOOOOOOooooooUUUUuuuuYYyyAaOo'
        )),
        '[^a-z0-9]+',
        '-',
        'g'
      )),
      ''
    ),
    'tenant'
  );
$$;

CREATE OR REPLACE FUNCTION public.assign_tenant_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug text;
  candidate_slug text;
  suffix integer := 1;
BEGIN
  -- Serializing this very short allocation section makes the suffix selection
  -- deterministic and race-safe, while the unique index remains the backstop.
  PERFORM pg_advisory_xact_lock(hashtext('public.tenants.slug'));

  base_slug := public.normalize_tenant_slug(NEW.name);
  candidate_slug := base_slug;

  WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = candidate_slug) LOOP
    suffix := suffix + 1;
    candidate_slug := base_slug || '-' || suffix::text;
  END LOOP;

  -- Deliberately overwrite any value supplied by a client.
  NEW.slug := candidate_slug;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_tenant_slug ON public.tenants;
CREATE TRIGGER trg_assign_tenant_slug
  BEFORE INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_tenant_slug();

-- Backfill only tenants whose slug is absent or blank.
DO $$
DECLARE
  tenant record;
  base_slug text;
  candidate_slug text;
  suffix integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('public.tenants.slug'));

  FOR tenant IN
    SELECT id, name
    FROM public.tenants
    WHERE slug IS NULL OR btrim(slug) = ''
    ORDER BY created_at NULLS LAST, id
    FOR UPDATE
  LOOP
    base_slug := public.normalize_tenant_slug(tenant.name);
    candidate_slug := base_slug;
    suffix := 1;

    WHILE EXISTS (
      SELECT 1 FROM public.tenants
      WHERE slug = candidate_slug AND id <> tenant.id
    ) LOOP
      suffix := suffix + 1;
      candidate_slug := base_slug || '-' || suffix::text;
    END LOOP;

    UPDATE public.tenants
    SET slug = candidate_slug
    WHERE id = tenant.id;
  END LOOP;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_key
  ON public.tenants (slug);

ALTER TABLE public.tenants
  ALTER COLUMN slug SET NOT NULL;

DROP FUNCTION IF EXISTS public.create_trial_workspace(uuid, text, text, text, text);

CREATE FUNCTION public.create_trial_workspace(
  p_user_id uuid,
  p_company_name text,
  p_full_name text,
  p_email text,
  p_phone text
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

  -- No slug is accepted as input: the BEFORE INSERT trigger creates it.
  INSERT INTO public.tenants (name)
  VALUES (btrim(p_company_name))
  RETURNING id, slug INTO created_tenant_id, created_slug;

  UPDATE public.profiles
  SET tenant_id = created_tenant_id,
      full_name = btrim(p_full_name),
      email = lower(btrim(p_email)),
      phone = btrim(p_phone),
      status = 'actif'
  WHERE id = p_user_id
    AND tenant_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Le profil administrateur n''a pas pu être créé';
  END IF;

  PERFORM public.initialize_tenant_roles(created_tenant_id, p_user_id);

  UPDATE public.subscriptions
  SET status = 'trial',
      trial_started_at = now(),
      trial_ends_at = now() + interval '3 days',
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
    'loginUrl', '/login/' || created_slug
  );
END;
$$;

REVOKE ALL ON FUNCTION public.assign_tenant_slug() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.normalize_tenant_slug(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_tenant_slug(text) TO service_role;

REVOKE ALL ON FUNCTION public.create_trial_workspace(uuid, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_trial_workspace(uuid, text, text, text, text)
  TO service_role;
