-- Complete, partner-scoped ERP trial onboarding.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS business_sector text,
  ADD COLUMN IF NOT EXISTS city text;

ALTER TABLE public.partner_trial_usage
  ADD COLUMN IF NOT EXISTS manager_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS business_sector text,
  ADD COLUMN IF NOT EXISTS requested_module_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS commission_amount numeric(12,2) NOT NULL DEFAULT 0
    CHECK (commission_amount >= 0);

ALTER TABLE public.partner_trial_usage
  DROP CONSTRAINT IF EXISTS partner_trial_usage_status_check;
ALTER TABLE public.partner_trial_usage
  ADD CONSTRAINT partner_trial_usage_status_check
  CHECK (status IN ('pending', 'active', 'expired', 'converted'));

CREATE OR REPLACE FUNCTION public.create_partner_trial(
  requested_name text,
  requested_sector text,
  requested_manager_name text,
  requested_phone text,
  requested_email text,
  requested_city text,
  requested_module_ids uuid[],
  requested_admin_user_id uuid,
  requested_actor_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_partner_id uuid;
  target_tenant_id uuid;
  selected_subscription public.partner_subscriptions%ROWTYPE;
  selected_offer public.partner_offers%ROWTYPE;
  normalized_client_email text := lower(btrim(requested_email));
  clean_module_ids uuid[];
  used_trials integer;
  trial_end timestamptz;
  admin_role_id uuid;
  auth_email text;
BEGIN
  target_partner_id := public.partner_id_for_actor(requested_actor_id);
  IF target_partner_id IS NULL THEN RAISE EXCEPTION 'Partenaire actif requis'; END IF;

  IF char_length(btrim(coalesce(requested_name, ''))) NOT BETWEEN 2 AND 120
     OR char_length(btrim(coalesce(requested_sector, ''))) NOT BETWEEN 2 AND 100
     OR char_length(btrim(coalesce(requested_manager_name, ''))) NOT BETWEEN 2 AND 120
     OR char_length(btrim(coalesce(requested_phone, ''))) NOT BETWEEN 6 AND 30
     OR char_length(btrim(coalesce(requested_city, ''))) NOT BETWEEN 2 AND 100
     OR normalized_client_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Informations de l''essai invalides';
  END IF;

  SELECT email INTO auth_email FROM auth.users WHERE id = requested_admin_user_id;
  IF auth_email IS NULL OR lower(auth_email) <> normalized_client_email THEN
    RAISE EXCEPTION 'Compte administrateur invalide';
  END IF;

  SELECT * INTO selected_subscription FROM public.partner_subscriptions
  WHERE partner_id = target_partner_id AND status = 'active' AND expires_at > now()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Abonnement partenaire actif requis'; END IF;
  SELECT * INTO selected_offer FROM public.partner_offers WHERE id = selected_subscription.offer_id;

  PERFORM 1 FROM public.partners WHERE id = target_partner_id AND is_active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Partenaire suspendu'; END IF;

  SELECT count(*) INTO used_trials FROM public.partner_trial_usage
  WHERE partner_id = target_partner_id;
  IF used_trials >= selected_offer.max_trials THEN RAISE EXCEPTION 'Quota d''essais gratuits atteint'; END IF;
  IF selected_offer.trial_duration_days <= 0 THEN RAISE EXCEPTION 'Essais gratuits indisponibles'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.partner_trial_usage
    WHERE partner_id = target_partner_id AND normalized_email = normalized_client_email
  ) THEN RAISE EXCEPTION 'Un essai a déjà été utilisé pour cet email'; END IF;

  SELECT coalesce(array_agg(DISTINCT module_id), '{}') INTO clean_module_ids
  FROM public.module_pack_items item
  WHERE item.pack_id = selected_offer.module_pack_id
    AND item.module_id = ANY(coalesce(requested_module_ids, '{}'))
    AND EXISTS (
      SELECT 1 FROM public.erp_modules module
      WHERE module.id = item.module_id AND module.is_active
    );
  IF cardinality(clean_module_ids) <> cardinality(coalesce(requested_module_ids, '{}')) THEN
    RAISE EXCEPTION 'Un ou plusieurs modules ne sont pas autorisés par l''offre partenaire';
  END IF;

  INSERT INTO public.tenants (name, is_active, business_sector, city)
  VALUES (btrim(requested_name), true, btrim(requested_sector), btrim(requested_city))
  RETURNING id INTO target_tenant_id;

  INSERT INTO public.partner_tenants (partner_id, tenant_id)
  VALUES (target_partner_id, target_tenant_id);

  INSERT INTO public.tenant_module_packs (tenant_id, pack_id, assigned_by)
  VALUES (target_tenant_id, selected_offer.module_pack_id, requested_actor_id)
  ON CONFLICT (tenant_id) DO UPDATE SET
    pack_id = EXCLUDED.pack_id, assigned_by = EXCLUDED.assigned_by, assigned_at = now();

  INSERT INTO public.tenant_modules (tenant_id, module_id, enabled)
  SELECT target_tenant_id, module.id, module.id = ANY(clean_module_ids)
  FROM public.erp_modules module
  ON CONFLICT (tenant_id, module_id) DO UPDATE SET enabled = EXCLUDED.enabled;

  trial_end := now() + make_interval(days => selected_offer.trial_duration_days);
  UPDATE public.subscriptions SET
    status = 'trial', trial_started_at = now(), trial_ends_at = trial_end,
    starts_at = NULL, ends_at = NULL, amount = 0, updated_at = now()
  WHERE tenant_id = target_tenant_id;

  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'Administrateur';
  IF admin_role_id IS NULL THEN RAISE EXCEPTION 'Rôle Administrateur introuvable'; END IF;
  UPDATE public.profiles SET
    tenant_id = target_tenant_id,
    role_id = admin_role_id,
    full_name = btrim(requested_manager_name),
    phone = btrim(requested_phone),
    email = normalized_client_email,
    status = 'actif',
    updated_at = now()
  WHERE id = requested_admin_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profil administrateur introuvable'; END IF;

  INSERT INTO public.partner_trial_usage (
    partner_id, tenant_id, offer_id, client_email, normalized_email,
    starts_at, expires_at, created_by, manager_name, phone, city,
    business_sector, requested_module_ids
  ) VALUES (
    target_partner_id, target_tenant_id, selected_offer.id, normalized_client_email,
    normalized_client_email, now(), trial_end, requested_actor_id,
    btrim(requested_manager_name), btrim(requested_phone), btrim(requested_city),
    btrim(requested_sector), clean_module_ids
  );

  INSERT INTO public.partner_activity_logs (partner_id, user_id, action, tenant_id, metadata)
  VALUES (
    target_partner_id, requested_actor_id, 'tenant.trial_created', target_tenant_id,
    jsonb_build_object(
      'email', normalized_client_email,
      'expires_at', trial_end,
      'admin_user_id', requested_admin_user_id,
      'module_ids', clean_module_ids
    )
  );
  RETURN target_tenant_id;
END
$$;

REVOKE ALL ON FUNCTION public.create_partner_trial(
  text, text, text, text, text, text, uuid[], uuid, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_partner_trial(
  text, text, text, text, text, text, uuid[], uuid, uuid
) TO service_role;
