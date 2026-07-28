-- Partner commercial offers, subscriptions and tenant-credit ledger.
-- Every mutation is exposed only to the service role and is performed in a
-- single PostgreSQL transaction. Partner-facing access remains read-only.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE TABLE public.partner_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  price numeric(14,2) NOT NULL CHECK (price >= 0),
  included_tenant_credits integer NOT NULL CHECK (included_tenant_credits >= 0),
  subscription_duration_days integer NOT NULL CHECK (subscription_duration_days > 0),
  module_pack_id uuid NOT NULL REFERENCES public.module_packs(id) ON DELETE RESTRICT,
  max_trials integer NOT NULL DEFAULT 0 CHECK (max_trials >= 0),
  trial_duration_days integer NOT NULL DEFAULT 0 CHECK (trial_duration_days >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.partner_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL UNIQUE REFERENCES public.partners(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES public.partner_offers(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('active', 'expired', 'suspended')),
  starts_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL CHECK (expires_at > starts_at),
  activated_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.partner_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE RESTRICT,
  offer_id uuid NOT NULL REFERENCES public.partner_offers(id) ON DELETE RESTRICT,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'XOF' CHECK (currency ~ '^[A-Z]{3}$'),
  status text NOT NULL DEFAULT 'validated' CHECK (status IN ('validated', 'rejected')),
  external_reference text NOT NULL UNIQUE CHECK (char_length(btrim(external_reference)) BETWEEN 1 AND 160),
  reason text,
  validated_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  validated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.partner_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE RESTRICT,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.partner_payments(id) ON DELETE RESTRICT,
  transaction_type text NOT NULL CHECK (
    transaction_type IN ('payment_credit', 'manual_credit', 'tenant_debit', 'manual_debit')
  ),
  credits integer NOT NULL CHECK (credits <> 0),
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  reason text NOT NULL CHECK (char_length(btrim(reason)) > 0),
  reference text,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_credit_transaction_sign CHECK (
    (transaction_type IN ('payment_credit', 'manual_credit') AND credits > 0)
    OR (transaction_type IN ('tenant_debit', 'manual_debit') AND credits < 0)
  )
);

CREATE TABLE public.partner_trial_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE RESTRICT,
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES public.partner_offers(id) ON DELETE RESTRICT,
  client_email text NOT NULL,
  normalized_email text NOT NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL CHECK (expires_at > starts_at),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'converted')),
  converted_at timestamptz,
  converted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, normalized_email),
  CHECK (normalized_email = lower(btrim(client_email)))
);

CREATE INDEX partner_payments_partner_created_idx
  ON public.partner_payments (partner_id, created_at DESC);
CREATE INDEX partner_credit_transactions_partner_created_idx
  ON public.partner_credit_transactions (partner_id, created_at DESC);
CREATE INDEX partner_trial_usage_partner_status_idx
  ON public.partner_trial_usage (partner_id, status, expires_at);
CREATE INDEX partner_subscriptions_offer_idx ON public.partner_subscriptions (offer_id);

ALTER TABLE public.partner_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_trial_usage ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.partner_offers, public.partner_subscriptions, public.partner_payments,
  public.partner_credit_transactions, public.partner_trial_usage
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.partner_offers, public.partner_subscriptions, public.partner_payments,
  public.partner_credit_transactions, public.partner_trial_usage TO authenticated;
GRANT ALL ON public.partner_offers, public.partner_subscriptions, public.partner_payments,
  public.partner_credit_transactions, public.partner_trial_usage TO service_role;

CREATE POLICY "partner_offers_read_available"
  ON public.partner_offers FOR SELECT TO authenticated
  USING (
    is_active
    OR EXISTS (
      SELECT 1 FROM public.partner_subscriptions subscription
      WHERE subscription.offer_id = partner_offers.id
        AND subscription.partner_id = public.current_partner_id()
    )
  );
CREATE POLICY "partner_subscriptions_read_own"
  ON public.partner_subscriptions FOR SELECT TO authenticated
  USING (partner_id = public.current_partner_id());
CREATE POLICY "partner_payments_read_own"
  ON public.partner_payments FOR SELECT TO authenticated
  USING (partner_id = public.current_partner_id());
CREATE POLICY "partner_credit_transactions_read_own"
  ON public.partner_credit_transactions FOR SELECT TO authenticated
  USING (partner_id = public.current_partner_id());
CREATE POLICY "partner_trial_usage_read_own"
  ON public.partner_trial_usage FOR SELECT TO authenticated
  USING (partner_id = public.current_partner_id());
CREATE POLICY "module_packs_read_current_partner_offer"
  ON public.module_packs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.partner_offers offer
      JOIN public.partner_subscriptions subscription ON subscription.offer_id = offer.id
      WHERE offer.module_pack_id = module_packs.id
        AND subscription.partner_id = public.current_partner_id()
    )
  );

CREATE OR REPLACE FUNCTION public.is_platform_admin_actor(requested_actor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
      SELECT 1 FROM public.platform_admins administrator
      WHERE administrator.user_id = requested_actor_id
    )
$$;

CREATE OR REPLACE FUNCTION public.partner_id_for_actor(requested_actor_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT membership.partner_id
  FROM public.partner_users membership
  JOIN public.partners partner ON partner.id = membership.partner_id
  WHERE membership.user_id = requested_actor_id
    AND partner.is_active
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.apply_offer_pack_to_tenant(
  requested_tenant_id uuid,
  requested_pack_id uuid,
  requested_actor_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tenant_module_packs (tenant_id, pack_id, assigned_at, assigned_by)
  VALUES (requested_tenant_id, requested_pack_id, now(), requested_actor_id)
  ON CONFLICT (tenant_id) DO UPDATE
    SET pack_id = EXCLUDED.pack_id,
        assigned_at = EXCLUDED.assigned_at,
        assigned_by = EXCLUDED.assigned_by;

  INSERT INTO public.tenant_modules (tenant_id, module_id, enabled)
  SELECT requested_tenant_id, module.id, EXISTS (
    SELECT 1 FROM public.module_pack_items item
    WHERE item.pack_id = requested_pack_id AND item.module_id = module.id
  )
  FROM public.erp_modules module
  ON CONFLICT (tenant_id, module_id) DO UPDATE SET enabled = EXCLUDED.enabled;
END
$$;

CREATE OR REPLACE FUNCTION public.manage_partner_offer(
  requested_offer_id uuid,
  requested_name text,
  requested_price numeric,
  requested_credits integer,
  requested_duration_days integer,
  requested_pack_id uuid,
  requested_max_trials integer,
  requested_trial_days integer,
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
     OR requested_price < 0 OR requested_credits < 0 OR requested_duration_days <= 0
     OR requested_max_trials < 0 OR requested_trial_days < 0 THEN
    RAISE EXCEPTION 'Paramètres de l''offre invalides';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.module_packs WHERE id = requested_pack_id) THEN
    RAISE EXCEPTION 'Pack de modules invalide';
  END IF;

  IF requested_offer_id IS NULL THEN
    INSERT INTO public.partner_offers (
      name, price, included_tenant_credits, subscription_duration_days,
      module_pack_id, max_trials, trial_duration_days, is_active
    ) VALUES (
      btrim(requested_name), requested_price, requested_credits, requested_duration_days,
      requested_pack_id, requested_max_trials, requested_trial_days, requested_is_active
    ) RETURNING id INTO target_id;
  ELSE
    UPDATE public.partner_offers SET
      name = btrim(requested_name), price = requested_price,
      included_tenant_credits = requested_credits,
      subscription_duration_days = requested_duration_days,
      module_pack_id = requested_pack_id, max_trials = requested_max_trials,
      trial_duration_days = requested_trial_days, is_active = requested_is_active,
      updated_at = now()
    WHERE id = requested_offer_id RETURNING id INTO target_id;
    IF target_id IS NULL THEN RAISE EXCEPTION 'Offre introuvable'; END IF;
  END IF;
  RETURN target_id;
END
$$;

CREATE OR REPLACE FUNCTION public.delete_partner_offer(
  requested_offer_id uuid,
  requested_actor_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin_actor(requested_actor_id) THEN
    RAISE EXCEPTION 'Super administrateur requis';
  END IF;
  DELETE FROM public.partner_offers WHERE id = requested_offer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offre introuvable ou déjà utilisée'; END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.validate_partner_payment(
  requested_partner_id uuid,
  requested_offer_id uuid,
  requested_amount numeric,
  requested_currency text,
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
  target_payment_id uuid;
  existing_payment public.partner_payments%ROWTYPE;
  selected_offer public.partner_offers%ROWTYPE;
  current_balance integer;
  subscription_start timestamptz := now();
  subscription_end timestamptz;
BEGIN
  IF NOT public.is_platform_admin_actor(requested_actor_id) THEN
    RAISE EXCEPTION 'Super administrateur requis';
  END IF;
  -- A transaction-scoped lock makes repeated concurrent callbacks with the
  -- same provider reference converge on the same payment.
  PERFORM pg_advisory_xact_lock(hashtextextended(btrim(requested_reference), 0));
  SELECT * INTO existing_payment FROM public.partner_payments
  WHERE external_reference = btrim(requested_reference);
  IF FOUND THEN
    IF existing_payment.partner_id <> requested_partner_id
       OR existing_payment.offer_id <> requested_offer_id
       OR existing_payment.amount <> requested_amount THEN
      RAISE EXCEPTION 'Référence de paiement déjà utilisée avec des données différentes';
    END IF;
    RETURN existing_payment.id;
  END IF;

  SELECT * INTO selected_offer FROM public.partner_offers
  WHERE id = requested_offer_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offre active introuvable'; END IF;
  IF requested_amount <> selected_offer.price THEN
    RAISE EXCEPTION 'Le montant ne correspond pas au prix de l''offre';
  END IF;

  PERFORM 1 FROM public.partners
  WHERE id = requested_partner_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Partenaire introuvable'; END IF;
  SELECT coalesce(sum(credits), 0)::integer INTO current_balance
  FROM public.partner_credit_transactions
  WHERE partner_id = requested_partner_id;

  SELECT greatest(now(), expires_at) INTO subscription_start
  FROM public.partner_subscriptions
  WHERE partner_id = requested_partner_id AND status = 'active'
  FOR UPDATE;
  subscription_start := coalesce(subscription_start, now());
  subscription_end := subscription_start + make_interval(days => selected_offer.subscription_duration_days);

  INSERT INTO public.partner_payments (
    partner_id, offer_id, amount, currency, external_reference, reason, validated_by
  ) VALUES (
    requested_partner_id, requested_offer_id, requested_amount,
    upper(btrim(requested_currency)), btrim(requested_reference),
    nullif(btrim(requested_reason), ''), requested_actor_id
  ) RETURNING id INTO target_payment_id;

  INSERT INTO public.partner_subscriptions (
    partner_id, offer_id, status, starts_at, expires_at, activated_at
  ) VALUES (
    requested_partner_id, requested_offer_id, 'active',
    subscription_start, subscription_end, now()
  )
  ON CONFLICT (partner_id) DO UPDATE SET
    offer_id = EXCLUDED.offer_id, status = 'active',
    starts_at = EXCLUDED.starts_at, expires_at = EXCLUDED.expires_at,
    activated_at = now(), updated_at = now();

  IF selected_offer.included_tenant_credits > 0 THEN
    current_balance := current_balance + selected_offer.included_tenant_credits;
    INSERT INTO public.partner_credit_transactions (
      partner_id, payment_id, transaction_type, credits, balance_after,
      reason, reference, actor_id
    ) VALUES (
      requested_partner_id, target_payment_id, 'payment_credit',
      selected_offer.included_tenant_credits, current_balance,
      'Crédits inclus dans l''offre ' || selected_offer.name,
      btrim(requested_reference), requested_actor_id
    );
  END IF;
  INSERT INTO public.partner_activity_logs (partner_id, user_id, action, metadata)
  VALUES (
    requested_partner_id, requested_actor_id, 'payment.validated',
    jsonb_build_object('payment_id', target_payment_id, 'offer_id', requested_offer_id,
      'amount', requested_amount, 'credits', selected_offer.included_tenant_credits)
  );
  RETURN target_payment_id;
END
$$;

CREATE OR REPLACE FUNCTION public.adjust_partner_credits(
  requested_partner_id uuid,
  requested_credits integer,
  requested_reason text,
  requested_reference text,
  requested_actor_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance integer;
  transaction_kind text;
BEGIN
  IF NOT public.is_platform_admin_actor(requested_actor_id) THEN
    RAISE EXCEPTION 'Super administrateur requis';
  END IF;
  IF requested_credits = 0 OR btrim(coalesce(requested_reason, '')) = '' THEN
    RAISE EXCEPTION 'Montant non nul et motif obligatoire';
  END IF;
  PERFORM 1 FROM public.partners
  WHERE id = requested_partner_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Partenaire introuvable'; END IF;
  SELECT coalesce(sum(credits), 0)::integer INTO current_balance
  FROM public.partner_credit_transactions
  WHERE partner_id = requested_partner_id;
  IF current_balance + requested_credits < 0 THEN RAISE EXCEPTION 'Solde de crédits insuffisant'; END IF;
  current_balance := current_balance + requested_credits;
  transaction_kind := CASE WHEN requested_credits > 0 THEN 'manual_credit' ELSE 'manual_debit' END;
  INSERT INTO public.partner_credit_transactions (
    partner_id, transaction_type, credits, balance_after, reason, reference, actor_id
  ) VALUES (
    requested_partner_id, transaction_kind, requested_credits, current_balance,
    btrim(requested_reason), nullif(btrim(requested_reference), ''), requested_actor_id
  );
  RETURN current_balance;
END
$$;

CREATE OR REPLACE FUNCTION public.create_partner_tenant(
  requested_name text,
  requested_email text,
  requested_trial boolean,
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
  current_balance integer;
  selected_subscription public.partner_subscriptions%ROWTYPE;
  selected_offer public.partner_offers%ROWTYPE;
  normalized_client_email text := lower(btrim(requested_email));
  used_trials integer;
  trial_end timestamptz;
BEGIN
  target_partner_id := public.partner_id_for_actor(requested_actor_id);
  IF target_partner_id IS NULL THEN RAISE EXCEPTION 'Partenaire actif requis'; END IF;
  IF char_length(btrim(coalesce(requested_name, ''))) NOT BETWEEN 1 AND 120
     OR normalized_client_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Nom ou email client invalide';
  END IF;

  SELECT * INTO selected_subscription FROM public.partner_subscriptions
  WHERE partner_id = target_partner_id AND status = 'active' AND expires_at > now()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Abonnement partenaire actif requis'; END IF;
  SELECT * INTO selected_offer FROM public.partner_offers WHERE id = selected_subscription.offer_id;

  -- Serializes both paid debits and trial quota consumption for this partner.
  PERFORM 1 FROM public.partners
  WHERE id = target_partner_id AND is_active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Partenaire suspendu'; END IF;
  SELECT coalesce(sum(credits), 0)::integer INTO current_balance
  FROM public.partner_credit_transactions
  WHERE partner_id = target_partner_id;

  IF requested_trial THEN
    SELECT count(*) INTO used_trials FROM public.partner_trial_usage
    WHERE partner_id = target_partner_id;
    IF used_trials >= selected_offer.max_trials THEN RAISE EXCEPTION 'Quota d''essais gratuits atteint'; END IF;
    IF selected_offer.trial_duration_days <= 0 THEN RAISE EXCEPTION 'Essais gratuits indisponibles'; END IF;
    IF EXISTS (
      SELECT 1 FROM public.partner_trial_usage
      WHERE partner_id = target_partner_id AND normalized_email = normalized_client_email
    ) THEN RAISE EXCEPTION 'Un essai a déjà été utilisé pour cet email'; END IF;
  ELSE
    IF current_balance < 1 THEN RAISE EXCEPTION 'Solde de crédits insuffisant'; END IF;
  END IF;

  INSERT INTO public.tenants (name, is_active)
  VALUES (btrim(requested_name), true) RETURNING id INTO target_tenant_id;
  INSERT INTO public.partner_tenants (partner_id, tenant_id)
  VALUES (target_partner_id, target_tenant_id);
  PERFORM public.apply_offer_pack_to_tenant(
    target_tenant_id, selected_offer.module_pack_id, requested_actor_id
  );

  IF requested_trial THEN
    trial_end := now() + make_interval(days => selected_offer.trial_duration_days);
    UPDATE public.subscriptions SET
      status = 'trial', trial_started_at = now(), trial_ends_at = trial_end,
      starts_at = NULL, ends_at = NULL, amount = 0
    WHERE tenant_id = target_tenant_id;
    INSERT INTO public.partner_trial_usage (
      partner_id, tenant_id, offer_id, client_email, normalized_email,
      starts_at, expires_at, created_by
    ) VALUES (
      target_partner_id, target_tenant_id, selected_offer.id, normalized_client_email,
      normalized_client_email, now(), trial_end, requested_actor_id
    );
    INSERT INTO public.partner_activity_logs (partner_id, user_id, action, tenant_id, metadata)
    VALUES (
      target_partner_id, requested_actor_id, 'tenant.trial_created', target_tenant_id,
      jsonb_build_object('email', normalized_client_email, 'expires_at', trial_end)
    );
  ELSE
    current_balance := current_balance - 1;
    UPDATE public.subscriptions SET
      status = 'active', trial_started_at = NULL, trial_ends_at = NULL,
      starts_at = now(),
      ends_at = now() + make_interval(days => selected_offer.subscription_duration_days),
      amount = selected_offer.price, billing_cycle = 'monthly'
    WHERE tenant_id = target_tenant_id;
    INSERT INTO public.partner_credit_transactions (
      partner_id, tenant_id, transaction_type, credits, balance_after,
      reason, reference, actor_id
    ) VALUES (
      target_partner_id, target_tenant_id, 'tenant_debit', -1, current_balance,
      'Activation d''un tenant payant', 'tenant:' || target_tenant_id, requested_actor_id
    );
    INSERT INTO public.partner_activity_logs (partner_id, user_id, action, tenant_id, metadata)
    VALUES (
      target_partner_id, requested_actor_id, 'tenant.paid_created', target_tenant_id,
      jsonb_build_object('email', normalized_client_email, 'credits', -1)
    );
  END IF;
  RETURN target_tenant_id;
END
$$;

CREATE OR REPLACE FUNCTION public.activate_partner_tenant(
  requested_tenant_id uuid,
  requested_actor_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_partner_id uuid;
  current_balance integer;
  current_status text;
  selected_subscription public.partner_subscriptions%ROWTYPE;
  selected_offer public.partner_offers%ROWTYPE;
BEGIN
  target_partner_id := public.partner_id_for_actor(requested_actor_id);
  IF target_partner_id IS NULL THEN RAISE EXCEPTION 'Partenaire actif requis'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.partner_tenants
    WHERE partner_id = target_partner_id AND tenant_id = requested_tenant_id
  ) THEN RAISE EXCEPTION 'Tenant non autorisé'; END IF;

  SELECT * INTO selected_subscription FROM public.partner_subscriptions
  WHERE partner_id = target_partner_id AND status = 'active' AND expires_at > now()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Abonnement partenaire actif requis'; END IF;
  SELECT * INTO selected_offer FROM public.partner_offers WHERE id = selected_subscription.offer_id;
  PERFORM 1 FROM public.partners
  WHERE id = target_partner_id AND is_active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Partenaire suspendu'; END IF;
  SELECT coalesce(sum(credits), 0)::integer INTO current_balance
  FROM public.partner_credit_transactions
  WHERE partner_id = target_partner_id;
  IF current_balance < 1 THEN RAISE EXCEPTION 'Solde de crédits insuffisant'; END IF;
  SELECT status INTO current_status FROM public.subscriptions
  WHERE tenant_id = requested_tenant_id FOR UPDATE;
  IF current_status = 'active' THEN RAISE EXCEPTION 'Ce tenant est déjà actif'; END IF;

  current_balance := current_balance - 1;
  UPDATE public.subscriptions SET
    status = 'active', starts_at = now(),
    ends_at = now() + make_interval(days => selected_offer.subscription_duration_days),
    updated_at = now()
  WHERE tenant_id = requested_tenant_id;
  UPDATE public.tenants SET is_active = true WHERE id = requested_tenant_id;
  PERFORM public.apply_offer_pack_to_tenant(
    requested_tenant_id, selected_offer.module_pack_id, requested_actor_id
  );
  UPDATE public.partner_trial_usage SET
    status = 'converted', converted_at = now(), converted_by = requested_actor_id
  WHERE tenant_id = requested_tenant_id AND status IN ('active', 'expired');
  INSERT INTO public.partner_credit_transactions (
    partner_id, tenant_id, transaction_type, credits, balance_after,
    reason, reference, actor_id
  ) VALUES (
    target_partner_id, requested_tenant_id, 'tenant_debit', -1, current_balance,
    'Activation ou réactivation d''un tenant payant',
    'tenant:' || requested_tenant_id, requested_actor_id
  );
  INSERT INTO public.partner_activity_logs (partner_id, user_id, action, tenant_id, metadata)
  VALUES (
    target_partner_id, requested_actor_id, 'tenant.activated', requested_tenant_id,
    jsonb_build_object('credits', -1)
  );
END
$$;

CREATE OR REPLACE FUNCTION public.expire_partner_trials()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count integer;
BEGIN
  UPDATE public.partner_subscriptions
  SET status = 'expired', updated_at = now()
  WHERE status = 'active' AND expires_at <= now();

  WITH expired AS (
    UPDATE public.partner_trial_usage
    SET status = 'expired'
    WHERE status = 'active' AND expires_at <= now()
    RETURNING tenant_id
  ), subscriptions_updated AS (
    UPDATE public.subscriptions subscription
    SET status = 'expired', updated_at = now()
    FROM expired
    WHERE subscription.tenant_id = expired.tenant_id
    RETURNING subscription.tenant_id
  )
  UPDATE public.tenants tenant
  SET is_active = false
  FROM subscriptions_updated expired
  WHERE tenant.id = expired.tenant_id;
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin_actor(uuid),
  public.partner_id_for_actor(uuid), public.apply_offer_pack_to_tenant(uuid, uuid, uuid),
  public.manage_partner_offer(uuid, text, numeric, integer, integer, uuid, integer, integer, boolean, uuid),
  public.delete_partner_offer(uuid, uuid),
  public.validate_partner_payment(uuid, uuid, numeric, text, text, text, uuid),
  public.adjust_partner_credits(uuid, integer, text, text, uuid),
  public.create_partner_tenant(text, text, boolean, uuid),
  public.activate_partner_tenant(uuid, uuid),
  public.expire_partner_trials()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin_actor(uuid),
  public.partner_id_for_actor(uuid), public.apply_offer_pack_to_tenant(uuid, uuid, uuid),
  public.manage_partner_offer(uuid, text, numeric, integer, integer, uuid, integer, integer, boolean, uuid),
  public.delete_partner_offer(uuid, uuid),
  public.validate_partner_payment(uuid, uuid, numeric, text, text, text, uuid),
  public.adjust_partner_credits(uuid, integer, text, text, uuid),
  public.create_partner_tenant(text, text, boolean, uuid),
  public.activate_partner_tenant(uuid, uuid),
  public.expire_partner_trials()
  TO service_role;
