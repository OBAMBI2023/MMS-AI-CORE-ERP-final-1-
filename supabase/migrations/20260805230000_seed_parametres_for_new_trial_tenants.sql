-- The public /essai-gratuit flow (create_trial_workspace) provisions a
-- tenant, profile, roles, module pack and trial subscription, but never a
-- public.parametres row. src/routes/parametres.tsx does a plain
-- `.select("*").eq("tenant_id", tenantId).maybeSingle()` with no
-- create-on-read fallback, so it renders "Paramètres introuvables." for any
-- tenant that has none — which today is every fresh trial tenant, confirmed
-- by tenant_id IS NULL on public.parametres for recent /essai-gratuit
-- signups.
--
-- Fix: create_trial_workspace now seeds one parametres row for the newly
-- created tenant, in the same transaction as the rest of the onboarding,
-- right after public.tenants gets its row so created_tenant_id is available.
-- company_name is set from the tenant's own name; every other column keeps
-- its table default (currency FCFA, DEV-/FAC-/REC- prefixes, dd/MM/yyyy date
-- format, etc. — see 20260716120000_clean_schema_rebuild.sql).
--
-- ON CONFLICT (tenant_id) DO NOTHING relies on the parametres_tenant_id_uq
-- unique constraint (20260725120000_parametres_unique_per_tenant.sql) to
-- stay a safe no-op — a brand new tenant_id can never already have a row,
-- but this keeps the insert idempotent if the function is ever re-run.
-- Tenants created before this migration (and any created outside this RPC)
-- are intentionally left untouched: no existing parametres row is modified
-- or backfilled here.
--
-- Signature, return type and grants are unchanged.

CREATE OR REPLACE FUNCTION public.create_trial_workspace(
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

  -- Seed the tenant's settings row now that created_tenant_id exists (see
  -- header comment). Every other column keeps its table default.
  INSERT INTO public.parametres (tenant_id, company_name)
  VALUES (created_tenant_id, btrim(p_company_name))
  ON CONFLICT (tenant_id) DO NOTHING;

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

  -- Inline starter-pack assignment (see 20260805220000_fix_trial_signup_super_admin_gate.sql):
  -- a freshly created tenant can never have an active premium subscription
  -- yet, so every module in the pack is simply enabled, plus dashboard
  -- unconditionally.
  INSERT INTO public.tenant_module_packs (tenant_id, pack_id, assigned_at, assigned_by)
  VALUES (created_tenant_id, commerce_generale_pack_id, now(), p_user_id)
  ON CONFLICT (tenant_id) DO UPDATE
    SET pack_id = EXCLUDED.pack_id, assigned_at = now(), assigned_by = EXCLUDED.assigned_by;

  INSERT INTO public.tenant_modules
    (tenant_id, module_id, enabled, assignment_source, updated_at, updated_by)
  SELECT
    created_tenant_id,
    module.id,
    module.code = 'dashboard' OR EXISTS (
      SELECT 1 FROM public.module_pack_items item
      WHERE item.pack_id = commerce_generale_pack_id AND item.module_id = module.id
    ),
    'pack',
    now(),
    p_user_id
  FROM public.erp_modules module
  ON CONFLICT (tenant_id, module_id) DO UPDATE
    SET enabled = EXCLUDED.enabled,
        assignment_source = 'pack',
        updated_at = now(),
        updated_by = p_user_id;

  INSERT INTO public.audit_logs (user_id, action, module, entity_id, metadata)
  VALUES (
    p_user_id,
    'tenant_module_pack_assigned',
    'tenant_modules',
    created_tenant_id::text,
    jsonb_build_object('tenant_id', created_tenant_id, 'pack_id', commerce_generale_pack_id)
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
