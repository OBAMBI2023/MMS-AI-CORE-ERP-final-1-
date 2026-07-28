-- Partner trials derive their partner, duration and enabled modules server-side.
CREATE TABLE public.trial_activity_profiles (
  code text PRIMARY KEY CHECK (code ~ '^[a-z0-9][a-z0-9_-]{1,49}$'),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE public.trial_activity_profile_modules (
  profile_code text NOT NULL REFERENCES public.trial_activity_profiles(code) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.erp_modules(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_code, module_id)
);

INSERT INTO public.trial_activity_profiles (code, name, description, sort_order)
VALUES
  ('commerce', 'Commerce', 'Vente, stock, achats et gestion commerciale.', 10),
  ('services', 'Services', 'Devis, clients et pilotage d''une activité de services.', 20),
  ('restaurant', 'Restaurant', 'Vente, stock et approvisionnement pour la restauration.', 30),
  ('general', 'Activité générale', 'Socle de gestion commun à toutes les activités.', 40)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.trial_activity_profile_modules (profile_code, module_id)
SELECT profile.code, module.id
FROM public.trial_activity_profiles profile
JOIN public.erp_modules module ON
  module.code IN ('dashboard', 'customers', 'reports', 'settings', 'users')
  OR (profile.code = 'commerce' AND module.code IN (
    'sales', 'products_services', 'suppliers', 'purchases', 'expenses',
    'quotes', 'inventory'
  ))
  OR (profile.code = 'services' AND module.code IN (
    'sales', 'products_services', 'expenses', 'quotes'
  ))
  OR (profile.code = 'restaurant' AND module.code IN (
    'sales', 'products_services', 'suppliers', 'purchases', 'expenses', 'inventory'
  ))
ON CONFLICT DO NOTHING;

ALTER TABLE public.trial_activity_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_activity_profile_modules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.trial_activity_profiles, public.trial_activity_profile_modules
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.trial_activity_profiles, public.trial_activity_profile_modules
  TO authenticated;
GRANT ALL ON public.trial_activity_profiles, public.trial_activity_profile_modules
  TO service_role;

CREATE POLICY "trial_activity_profiles_read_active"
  ON public.trial_activity_profiles FOR SELECT TO authenticated
  USING (is_active);
CREATE POLICY "trial_activity_profile_modules_read_active"
  ON public.trial_activity_profile_modules FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trial_activity_profiles profile
      WHERE profile.code = trial_activity_profile_modules.profile_code
        AND profile.is_active
    )
  );

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS activity_profile_code text
    REFERENCES public.trial_activity_profiles(code) ON DELETE SET NULL;
ALTER TABLE public.partner_trial_usage
  ADD COLUMN IF NOT EXISTS activity_profile_code text
    REFERENCES public.trial_activity_profiles(code) ON DELETE RESTRICT;

DROP FUNCTION IF EXISTS public.create_partner_trial(
  text, text, text, text, text, text, uuid[], uuid, uuid
);

CREATE FUNCTION public.create_partner_trial(
  requested_name text,
  requested_activity_profile_code text,
  requested_manager_name text,
  requested_phone text,
  requested_email text,
  requested_city text,
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
  selected_profile public.trial_activity_profiles%ROWTYPE;
  normalized_client_email text := lower(btrim(requested_email));
  enabled_module_ids uuid[];
  used_trials integer;
  trial_start timestamptz := now();
  trial_end timestamptz;
  admin_role_id uuid;
  auth_email text;
BEGIN
  -- The partner is resolved exclusively from the authenticated server actor.
  target_partner_id := public.partner_id_for_actor(requested_actor_id);
  IF target_partner_id IS NULL THEN RAISE EXCEPTION 'Partenaire actif requis'; END IF;

  IF char_length(btrim(coalesce(requested_name, ''))) NOT BETWEEN 2 AND 120
     OR char_length(btrim(coalesce(requested_manager_name, ''))) NOT BETWEEN 2 AND 120
     OR char_length(btrim(coalesce(requested_phone, ''))) NOT BETWEEN 6 AND 30
     OR char_length(btrim(coalesce(requested_city, ''))) NOT BETWEEN 2 AND 100
     OR normalized_client_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Informations de l''essai invalides';
  END IF;

  SELECT * INTO selected_profile
  FROM public.trial_activity_profiles
  WHERE code = lower(btrim(requested_activity_profile_code)) AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profil d''activité invalide'; END IF;

  SELECT email INTO auth_email FROM auth.users WHERE id = requested_admin_user_id;
  IF auth_email IS NULL OR lower(auth_email) <> normalized_client_email THEN
    RAISE EXCEPTION 'Compte administrateur invalide';
  END IF;

  SELECT * INTO selected_subscription
  FROM public.partner_subscriptions
  WHERE partner_id = target_partner_id AND status = 'active' AND expires_at > now()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Abonnement partenaire actif requis'; END IF;

  SELECT * INTO selected_offer
  FROM public.partner_offers
  WHERE id = selected_subscription.offer_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offre partenaire indisponible'; END IF;

  SELECT count(*) INTO used_trials
  FROM public.partner_trial_usage
  WHERE partner_id = target_partner_id;
  IF used_trials >= selected_offer.max_trials THEN RAISE EXCEPTION 'Quota d''essais gratuits atteint'; END IF;
  IF selected_offer.trial_duration_days <= 0 THEN RAISE EXCEPTION 'Essais gratuits indisponibles'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.partner_trial_usage
    WHERE partner_id = target_partner_id AND normalized_email = normalized_client_email
  ) THEN RAISE EXCEPTION 'Un essai a déjà été utilisé pour cet email'; END IF;

  SELECT coalesce(array_agg(module.id ORDER BY module.sort_order), '{}')
  INTO enabled_module_ids
  FROM public.erp_modules module
  JOIN public.module_pack_items offer_item
    ON offer_item.module_id = module.id
   AND offer_item.pack_id = selected_offer.module_pack_id
  JOIN public.trial_activity_profile_modules profile_item
    ON profile_item.module_id = module.id
   AND profile_item.profile_code = selected_profile.code
  WHERE module.is_active;
  IF cardinality(enabled_module_ids) = 0 THEN
    RAISE EXCEPTION 'Aucun module disponible pour ce profil d''activité';
  END IF;

  INSERT INTO public.tenants (
    name, is_active, business_sector, city, activity_profile_code
  ) VALUES (
    btrim(requested_name), true, selected_profile.name, btrim(requested_city), selected_profile.code
  ) RETURNING id INTO target_tenant_id;

  INSERT INTO public.partner_tenants (partner_id, tenant_id)
  VALUES (target_partner_id, target_tenant_id);
  INSERT INTO public.tenant_module_packs (tenant_id, pack_id, assigned_by)
  VALUES (target_tenant_id, selected_offer.module_pack_id, requested_actor_id)
  ON CONFLICT (tenant_id) DO UPDATE SET
    pack_id = EXCLUDED.pack_id, assigned_by = EXCLUDED.assigned_by, assigned_at = now();
  INSERT INTO public.tenant_modules (tenant_id, module_id, enabled)
  SELECT target_tenant_id, module.id, module.id = ANY(enabled_module_ids)
  FROM public.erp_modules module
  ON CONFLICT (tenant_id, module_id) DO UPDATE SET enabled = EXCLUDED.enabled;

  trial_end := trial_start + make_interval(days => selected_offer.trial_duration_days);
  UPDATE public.subscriptions SET
    status = 'trial', trial_started_at = trial_start, trial_ends_at = trial_end,
    starts_at = NULL, ends_at = NULL, amount = 0, updated_at = now()
  WHERE tenant_id = target_tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Licence Trial non créée'; END IF;

  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'Administrateur';
  IF admin_role_id IS NULL THEN RAISE EXCEPTION 'Rôle Administrateur introuvable'; END IF;
  UPDATE public.profiles SET
    tenant_id = target_tenant_id, role_id = admin_role_id,
    full_name = btrim(requested_manager_name), phone = btrim(requested_phone),
    email = normalized_client_email, status = 'actif', updated_at = now()
  WHERE id = requested_admin_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profil administrateur introuvable'; END IF;

  INSERT INTO public.partner_trial_usage (
    partner_id, tenant_id, offer_id, client_email, normalized_email,
    starts_at, expires_at, created_by, manager_name, phone, city,
    business_sector, activity_profile_code, requested_module_ids
  ) VALUES (
    target_partner_id, target_tenant_id, selected_offer.id, normalized_client_email,
    normalized_client_email, trial_start, trial_end, requested_actor_id,
    btrim(requested_manager_name), btrim(requested_phone), btrim(requested_city),
    selected_profile.name, selected_profile.code, enabled_module_ids
  );
  INSERT INTO public.partner_activity_logs (partner_id, user_id, action, tenant_id, metadata)
  VALUES (
    target_partner_id, requested_actor_id, 'tenant.trial_created', target_tenant_id,
    jsonb_build_object(
      'email', normalized_client_email, 'expires_at', trial_end,
      'activity_profile', selected_profile.code, 'module_ids', enabled_module_ids
    )
  );
  RETURN target_tenant_id;
END
$$;

REVOKE ALL ON FUNCTION public.create_partner_trial(
  text, text, text, text, text, text, uuid, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_partner_trial(
  text, text, text, text, text, text, uuid, uuid
) TO service_role;
