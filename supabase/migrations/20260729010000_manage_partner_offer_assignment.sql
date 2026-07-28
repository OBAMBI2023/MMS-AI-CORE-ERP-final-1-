-- Assign partner offers without bypassing platform RBAC or losing subscription history.

ALTER TABLE public.partner_subscriptions
  DROP CONSTRAINT IF EXISTS partner_subscriptions_partner_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS partner_subscriptions_one_active_per_partner_idx
  ON public.partner_subscriptions (partner_id)
  WHERE status = 'active';

-- Reuse the existing offer-management RPC name. PostgreSQL/PostgREST selects
-- this assignment overload from its distinct requested_* argument names.
CREATE OR REPLACE FUNCTION public.manage_partner_offer(
  requested_partner_id uuid,
  requested_offer_id uuid,
  requested_starts_at timestamptz,
  requested_expires_at timestamptz,
  requested_replace_active boolean,
  requested_actor_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_offer public.partner_offers%ROWTYPE;
  existing_subscription public.partner_subscriptions%ROWTYPE;
  target_subscription_id uuid;
BEGIN
  IF NOT public.is_platform_admin_actor(requested_actor_id) THEN
    RAISE EXCEPTION 'Super administrateur requis';
  END IF;
  IF requested_expires_at <= requested_starts_at THEN
    RAISE EXCEPTION 'La date de fin doit être postérieure à la date de début';
  END IF;

  PERFORM 1
  FROM public.partners
  WHERE id = requested_partner_id AND is_active
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Partenaire actif introuvable'; END IF;

  SELECT *
  INTO selected_offer
  FROM public.partner_offers
  WHERE id = requested_offer_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offre active introuvable'; END IF;
  IF requested_expires_at::date <>
     (requested_starts_at + make_interval(days => selected_offer.subscription_duration_days))::date THEN
    RAISE EXCEPTION 'La date de fin doit correspondre à la durée de l''offre';
  END IF;

  -- Clean up a stale row before applying the partial uniqueness constraint.
  UPDATE public.partner_subscriptions
  SET status = 'expired', updated_at = now()
  WHERE partner_id = requested_partner_id
    AND status = 'active'
    AND expires_at <= now();

  SELECT *
  INTO existing_subscription
  FROM public.partner_subscriptions
  WHERE partner_id = requested_partner_id AND status = 'active'
  FOR UPDATE;

  IF FOUND AND NOT requested_replace_active THEN
    RAISE EXCEPTION 'Un abonnement partenaire actif existe déjà';
  END IF;

  IF FOUND THEN
    UPDATE public.partner_subscriptions
    SET status = 'expired',
        expires_at = greatest(
          starts_at + interval '1 second',
          least(expires_at, requested_starts_at)
        ),
        updated_at = now()
    WHERE id = existing_subscription.id;
  END IF;

  INSERT INTO public.partner_subscriptions (
    partner_id, offer_id, status, starts_at, expires_at, activated_at
  ) VALUES (
    requested_partner_id, requested_offer_id, 'active',
    requested_starts_at, requested_expires_at, now()
  )
  RETURNING id INTO target_subscription_id;

  -- Reuse the existing, locked ledger mutation instead of duplicating balance logic.
  IF selected_offer.included_tenant_credits > 0 THEN
    PERFORM public.adjust_partner_credits(
      requested_partner_id,
      selected_offer.included_tenant_credits,
      'Crédits inclus dans l''offre ' || selected_offer.name,
      'subscription:' || target_subscription_id,
      requested_actor_id
    );
  END IF;

  INSERT INTO public.partner_activity_logs (partner_id, user_id, action, metadata)
  VALUES (
    requested_partner_id,
    requested_actor_id,
    CASE WHEN existing_subscription.id IS NULL
      THEN 'subscription.assigned'
      ELSE 'subscription.replaced'
    END,
    jsonb_build_object(
      'subscription_id', target_subscription_id,
      'offer_id', requested_offer_id,
      'replaced_subscription_id', existing_subscription.id,
      'starts_at', requested_starts_at,
      'expires_at', requested_expires_at,
      'credits', selected_offer.included_tenant_credits,
      'max_trials', selected_offer.max_trials,
      'trial_duration_days', selected_offer.trial_duration_days
    )
  );

  RETURN target_subscription_id;
END
$$;

REVOKE ALL ON FUNCTION public.manage_partner_offer(uuid, uuid, timestamptz, timestamptz, boolean, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_partner_offer(uuid, uuid, timestamptz, timestamptz, boolean, uuid)
  TO service_role;

-- Keep payment validation compatible with historical subscription rows.
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
  existing_subscription public.partner_subscriptions%ROWTYPE;
  selected_offer public.partner_offers%ROWTYPE;
  current_balance integer;
  subscription_start timestamptz := now();
  subscription_end timestamptz;
BEGIN
  IF NOT public.is_platform_admin_actor(requested_actor_id) THEN
    RAISE EXCEPTION 'Super administrateur requis';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(btrim(requested_reference), 0));
  SELECT * INTO existing_payment
  FROM public.partner_payments
  WHERE external_reference = btrim(requested_reference);
  IF FOUND THEN
    IF existing_payment.partner_id <> requested_partner_id
       OR existing_payment.offer_id <> requested_offer_id
       OR existing_payment.amount <> requested_amount THEN
      RAISE EXCEPTION 'Référence de paiement déjà utilisée avec des données différentes';
    END IF;
    RETURN existing_payment.id;
  END IF;

  SELECT * INTO selected_offer
  FROM public.partner_offers
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

  SELECT * INTO existing_subscription
  FROM public.partner_subscriptions
  WHERE partner_id = requested_partner_id AND status = 'active'
  FOR UPDATE;
  IF FOUND THEN
    subscription_start := greatest(now(), existing_subscription.expires_at);
    UPDATE public.partner_subscriptions
    SET status = 'expired', updated_at = now()
    WHERE id = existing_subscription.id;
  END IF;
  subscription_end := subscription_start
    + make_interval(days => selected_offer.subscription_duration_days);

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
  );

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
    jsonb_build_object(
      'payment_id', target_payment_id,
      'offer_id', requested_offer_id,
      'amount', requested_amount,
      'credits', selected_offer.included_tenant_credits
    )
  );
  RETURN target_payment_id;
END
$$;
