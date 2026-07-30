-- Independent tenant-registration credit packs for Partners.
-- Existing offer/subscription behavior is preserved; all balance mutations
-- continue to use the existing append-only partner credit ledger.

CREATE TABLE public.partner_credit_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  price numeric(14,2) NOT NULL CHECK (price >= 0),
  credit_count integer NOT NULL CHECK (credit_count > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.partner_credit_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE RESTRICT,
  credit_pack_id uuid NOT NULL REFERENCES public.partner_credit_packs(id) ON DELETE RESTRICT,
  credits integer NOT NULL CHECK (credits > 0),
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'XOF' CHECK (currency ~ '^[A-Z]{3}$'),
  reference text NOT NULL UNIQUE CHECK (char_length(btrim(reference)) BETWEEN 1 AND 160),
  reason text,
  attributed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_credit_transactions
  ADD COLUMN credit_purchase_id uuid
    REFERENCES public.partner_credit_purchases(id) ON DELETE RESTRICT;

ALTER TABLE public.partner_credit_transactions
  DROP CONSTRAINT partner_credit_transactions_transaction_type_check;
ALTER TABLE public.partner_credit_transactions
  ADD CONSTRAINT partner_credit_transactions_transaction_type_check CHECK (
    transaction_type IN (
      'payment_credit', 'purchase_credit', 'manual_credit',
      'tenant_debit', 'manual_debit'
    )
  );
ALTER TABLE public.partner_credit_transactions
  DROP CONSTRAINT partner_credit_transaction_sign;
ALTER TABLE public.partner_credit_transactions
  ADD CONSTRAINT partner_credit_transaction_sign CHECK (
    (transaction_type IN ('payment_credit', 'purchase_credit', 'manual_credit') AND credits > 0)
    OR (transaction_type IN ('tenant_debit', 'manual_debit') AND credits < 0)
  );

CREATE INDEX partner_credit_purchases_partner_created_idx
  ON public.partner_credit_purchases (partner_id, created_at DESC);

ALTER TABLE public.partner_credit_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_credit_purchases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_credit_packs, public.partner_credit_purchases
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.partner_credit_packs, public.partner_credit_purchases TO authenticated;
GRANT ALL ON public.partner_credit_packs, public.partner_credit_purchases TO service_role;

CREATE POLICY "partner_credit_packs_read_active"
  ON public.partner_credit_packs FOR SELECT TO authenticated
  USING (is_active OR public.is_platform_admin_actor(auth.uid()));
CREATE POLICY "partner_credit_purchases_read_own_or_admin"
  ON public.partner_credit_purchases FOR SELECT TO authenticated
  USING (
    partner_id = public.current_partner_id()
    OR public.is_platform_admin_actor(auth.uid())
  );

CREATE OR REPLACE FUNCTION public.manage_partner_credit_pack(
  requested_pack_id uuid,
  requested_name text,
  requested_price numeric,
  requested_credit_count integer,
  requested_is_active boolean,
  requested_actor_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id uuid;
BEGIN
  IF NOT public.is_platform_admin_actor(requested_actor_id) THEN
    RAISE EXCEPTION 'Super administrateur requis';
  END IF;
  IF char_length(btrim(coalesce(requested_name, ''))) NOT BETWEEN 1 AND 120
     OR requested_price < 0 OR requested_credit_count <= 0 THEN
    RAISE EXCEPTION 'Paramètres du pack de crédits invalides';
  END IF;

  IF requested_pack_id IS NULL THEN
    INSERT INTO public.partner_credit_packs (name, price, credit_count, is_active)
    VALUES (btrim(requested_name), requested_price, requested_credit_count, requested_is_active)
    RETURNING id INTO target_id;
  ELSE
    UPDATE public.partner_credit_packs SET
      name = btrim(requested_name),
      price = requested_price,
      credit_count = requested_credit_count,
      is_active = requested_is_active,
      updated_at = now()
    WHERE id = requested_pack_id
    RETURNING id INTO target_id;
    IF target_id IS NULL THEN RAISE EXCEPTION 'Pack de crédits introuvable'; END IF;
  END IF;
  RETURN target_id;
END
$$;

CREATE OR REPLACE FUNCTION public.purchase_partner_credit_pack(
  requested_partner_id uuid,
  requested_pack_id uuid,
  requested_reference text,
  requested_reason text,
  requested_actor_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_pack public.partner_credit_packs%ROWTYPE;
  existing_purchase public.partner_credit_purchases%ROWTYPE;
  target_purchase_id uuid;
  current_balance integer;
BEGIN
  IF NOT public.is_platform_admin_actor(requested_actor_id) THEN
    RAISE EXCEPTION 'Super administrateur requis';
  END IF;
  IF btrim(coalesce(requested_reference, '')) = '' THEN
    RAISE EXCEPTION 'Référence obligatoire';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('credit-pack:' || btrim(requested_reference), 0));
  SELECT * INTO existing_purchase
  FROM public.partner_credit_purchases
  WHERE reference = btrim(requested_reference);
  IF FOUND THEN
    IF existing_purchase.partner_id <> requested_partner_id
       OR existing_purchase.credit_pack_id <> requested_pack_id THEN
      RAISE EXCEPTION 'Référence déjà utilisée avec des données différentes';
    END IF;
    RETURN existing_purchase.id;
  END IF;

  SELECT * INTO selected_pack
  FROM public.partner_credit_packs
  WHERE id = requested_pack_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pack de crédits actif introuvable'; END IF;

  PERFORM 1 FROM public.partners
  WHERE id = requested_partner_id AND is_active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Partenaire actif introuvable'; END IF;

  SELECT coalesce(sum(credits), 0)::integer INTO current_balance
  FROM public.partner_credit_transactions
  WHERE partner_id = requested_partner_id;
  current_balance := current_balance + selected_pack.credit_count;

  INSERT INTO public.partner_credit_purchases (
    partner_id, credit_pack_id, credits, amount, reference, reason, attributed_by
  ) VALUES (
    requested_partner_id, selected_pack.id, selected_pack.credit_count,
    selected_pack.price, btrim(requested_reference),
    nullif(btrim(requested_reason), ''), requested_actor_id
  ) RETURNING id INTO target_purchase_id;

  INSERT INTO public.partner_credit_transactions (
    partner_id, credit_purchase_id, transaction_type, credits, balance_after,
    reason, reference, actor_id
  ) VALUES (
    requested_partner_id, target_purchase_id, 'purchase_credit',
    selected_pack.credit_count, current_balance,
    'Achat/attribution du pack ' || selected_pack.name,
    btrim(requested_reference), requested_actor_id
  );
  INSERT INTO public.partner_activity_logs (partner_id, user_id, action, metadata)
  VALUES (
    requested_partner_id, requested_actor_id, 'credits.pack_attributed',
    jsonb_build_object(
      'purchase_id', target_purchase_id, 'pack_id', selected_pack.id,
      'credits', selected_pack.credit_count, 'amount', selected_pack.price
    )
  );
  RETURN target_purchase_id;
END
$$;

-- Paid tenant onboarding: auth user is created first by the trusted server,
-- then all database work and the single-credit debit happen atomically here.
CREATE OR REPLACE FUNCTION public.create_partner_paid_tenant(
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
  normalized_email text := lower(btrim(requested_email));
  current_balance integer;
  admin_role_id uuid;
  auth_email text;
BEGIN
  target_partner_id := public.partner_id_for_actor(requested_actor_id);
  IF target_partner_id IS NULL THEN RAISE EXCEPTION 'Partenaire actif requis'; END IF;
  IF char_length(btrim(coalesce(requested_name, ''))) NOT BETWEEN 2 AND 120
     OR char_length(btrim(coalesce(requested_manager_name, ''))) NOT BETWEEN 2 AND 120
     OR char_length(btrim(coalesce(requested_phone, ''))) NOT BETWEEN 6 AND 30
     OR char_length(btrim(coalesce(requested_city, ''))) NOT BETWEEN 2 AND 100
     OR normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Informations du tenant invalides';
  END IF;
  SELECT * INTO selected_profile FROM public.trial_activity_profiles
  WHERE code = lower(btrim(requested_activity_profile_code)) AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profil d''activité invalide'; END IF;
  SELECT email INTO auth_email FROM auth.users WHERE id = requested_admin_user_id;
  IF auth_email IS NULL OR lower(auth_email) <> normalized_email THEN
    RAISE EXCEPTION 'Compte administrateur invalide';
  END IF;
  SELECT * INTO selected_subscription FROM public.partner_subscriptions
  WHERE partner_id = target_partner_id AND status = 'active' AND expires_at > now()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Abonnement partenaire actif requis'; END IF;
  SELECT * INTO selected_offer FROM public.partner_offers
  WHERE id = selected_subscription.offer_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offre partenaire indisponible'; END IF;

  PERFORM 1 FROM public.partners
  WHERE id = target_partner_id AND is_active FOR UPDATE;
  SELECT coalesce(sum(credits), 0)::integer INTO current_balance
  FROM public.partner_credit_transactions WHERE partner_id = target_partner_id;
  IF current_balance < 1 THEN RAISE EXCEPTION 'Solde de crédits insuffisant'; END IF;

  INSERT INTO public.tenants (name, is_active, business_sector, city, activity_profile_code)
  VALUES (btrim(requested_name), true, selected_profile.name, btrim(requested_city), selected_profile.code)
  RETURNING id INTO target_tenant_id;
  INSERT INTO public.partner_tenants (partner_id, tenant_id)
  VALUES (target_partner_id, target_tenant_id);
  PERFORM public.apply_offer_pack_to_tenant(
    target_tenant_id, selected_offer.module_pack_id, requested_actor_id
  );
  UPDATE public.subscriptions SET
    status = 'active', trial_started_at = NULL, trial_ends_at = NULL,
    starts_at = now(),
    ends_at = now() + make_interval(days => selected_offer.subscription_duration_days),
    amount = selected_offer.price, billing_cycle = 'monthly', updated_at = now()
  WHERE tenant_id = target_tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Licence tenant non créée'; END IF;

  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'Administrateur';
  IF admin_role_id IS NULL THEN RAISE EXCEPTION 'Rôle Administrateur introuvable'; END IF;
  UPDATE public.profiles SET
    tenant_id = target_tenant_id, role_id = admin_role_id,
    full_name = btrim(requested_manager_name), phone = btrim(requested_phone),
    email = normalized_email, status = 'actif', updated_at = now()
  WHERE id = requested_admin_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profil administrateur introuvable'; END IF;

  current_balance := current_balance - 1;
  INSERT INTO public.partner_credit_transactions (
    partner_id, tenant_id, transaction_type, credits, balance_after,
    reason, reference, actor_id
  ) VALUES (
    target_partner_id, target_tenant_id, 'tenant_debit', -1, current_balance,
    'Création d''un tenant', 'tenant:' || target_tenant_id, requested_actor_id
  );
  INSERT INTO public.partner_activity_logs (partner_id, user_id, action, tenant_id, metadata)
  VALUES (
    target_partner_id, requested_actor_id, 'tenant.paid_created', target_tenant_id,
    jsonb_build_object('email', normalized_email, 'credits', -1)
  );
  RETURN target_tenant_id;
END
$$;

REVOKE ALL ON FUNCTION public.manage_partner_credit_pack(uuid, text, numeric, integer, boolean, uuid),
  public.purchase_partner_credit_pack(uuid, uuid, text, text, uuid),
  public.create_partner_paid_tenant(text, text, text, text, text, text, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_partner_credit_pack(uuid, text, numeric, integer, boolean, uuid),
  public.purchase_partner_credit_pack(uuid, uuid, text, text, uuid),
  public.create_partner_paid_tenant(text, text, text, text, text, text, uuid, uuid)
  TO service_role;
