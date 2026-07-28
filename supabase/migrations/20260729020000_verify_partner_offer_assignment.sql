-- Make a successful manage_partner_offer response prove that the subscription
-- was inserted and is still visible at the end of the function transaction.

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
  inserted_rows integer;
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
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partenaire actif introuvable';
  END IF;

  SELECT *
  INTO selected_offer
  FROM public.partner_offers
  WHERE id = requested_offer_id AND is_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offre active introuvable';
  END IF;
  IF requested_expires_at::date <>
     (requested_starts_at + make_interval(days => selected_offer.subscription_duration_days))::date THEN
    RAISE EXCEPTION 'La date de fin doit correspondre à la durée de l''offre';
  END IF;

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

  GET DIAGNOSTICS inserted_rows = ROW_COUNT;
  IF inserted_rows <> 1 OR target_subscription_id IS NULL THEN
    RAISE EXCEPTION
      'manage_partner_offer: insertion échouée (lignes=%, abonnement=%)',
      inserted_rows,
      target_subscription_id;
  END IF;

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

  -- This final read also proves no later statement silently removed or changed
  -- the row. Any exception aborts the whole RPC transaction; it is not masked.
  PERFORM 1
  FROM public.partner_subscriptions
  WHERE id = target_subscription_id
    AND partner_id = requested_partner_id
    AND offer_id = requested_offer_id
    AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION
      'manage_partner_offer: abonnement % absent après insertion',
      target_subscription_id;
  END IF;

  RETURN target_subscription_id;
END
$$;

REVOKE ALL ON FUNCTION public.manage_partner_offer(uuid, uuid, timestamptz, timestamptz, boolean, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_partner_offer(uuid, uuid, timestamptz, timestamptz, boolean, uuid)
  TO service_role;
