-- Keep the text RPC contract used by the server, but validate and convert it
-- before writing to the enum-backed subscriptions.billing_cycle column.
CREATE OR REPLACE FUNCTION public.activate_pending_trial(
  p_tenant_id uuid, p_actor_id uuid, p_pack_id uuid, p_module_ids uuid[],
  p_billing_cycle text, p_duration_days integer, p_amount numeric DEFAULT 0
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin_id uuid;
  v_role_id uuid;
  v_now timestamptz := now();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = p_actor_id) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  IF p_duration_days < 1 OR p_duration_days > 3650 THEN
    RAISE EXCEPTION 'Durée invalide';
  END IF;
  IF p_billing_cycle IS NULL OR p_billing_cycle NOT IN ('monthly', 'quarterly', 'yearly') THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = format(
        'Cycle de facturation inconnu: %s. Valeurs autorisées: monthly, quarterly, yearly',
        coalesce(quote_literal(p_billing_cycle), 'NULL')
      );
  END IF;

  SELECT id INTO v_admin_id
  FROM public.profiles
  WHERE tenant_id = p_tenant_id AND status = 'pending'
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE;
  IF v_admin_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.tenants
    WHERE id = p_tenant_id AND onboarding_status = 'pending_configuration'
    FOR UPDATE
  ) THEN
    RAISE EXCEPTION 'Demande pending introuvable';
  END IF;

  PERFORM public.initialize_tenant_roles(p_tenant_id, v_admin_id);
  SELECT id INTO v_role_id
  FROM public.roles
  WHERE tenant_id = p_tenant_id AND name = 'Administrateur';
  UPDATE public.profiles SET status = 'active', role_id = v_role_id WHERE id = v_admin_id;
  UPDATE public.tenants SET is_active = true, onboarding_status = 'active' WHERE id = p_tenant_id;
  DELETE FROM public.tenant_module_packs WHERE tenant_id = p_tenant_id;
  IF p_pack_id IS NOT NULL THEN
    INSERT INTO public.tenant_module_packs(tenant_id, pack_id) VALUES (p_tenant_id, p_pack_id);
  END IF;
  DELETE FROM public.tenant_modules WHERE tenant_id = p_tenant_id;
  INSERT INTO public.tenant_modules(tenant_id, module_id, enabled)
    SELECT p_tenant_id, id, true
    FROM public.erp_modules
    WHERE id = ANY(COALESCE(p_module_ids, ARRAY[]::uuid[])) AND is_active;
  INSERT INTO public.subscriptions(
    tenant_id, trial_started_at, trial_ends_at, amount, billing_cycle, status
  ) VALUES (
    p_tenant_id, v_now, v_now + make_interval(days => p_duration_days), p_amount,
    p_billing_cycle::public.subscription_billing_cycle, 'trial'
  )
  ON CONFLICT(tenant_id) DO UPDATE SET
    trial_started_at = v_now,
    trial_ends_at = v_now + make_interval(days => p_duration_days),
    starts_at = NULL,
    ends_at = NULL,
    amount = p_amount,
    billing_cycle = p_billing_cycle::public.subscription_billing_cycle,
    status = 'trial';
  INSERT INTO public.audit_logs(user_id, entity_id, action, module, metadata) VALUES (
    p_actor_id, p_tenant_id::text, 'Demande d’essai activée', 'Onboarding',
    jsonb_build_object('duration_days', p_duration_days, 'modules', p_module_ids, 'pack_id', p_pack_id)
  );
END $$;

REVOKE ALL ON FUNCTION public.activate_pending_trial(uuid,uuid,uuid,uuid[],text,integer,numeric)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_pending_trial(uuid,uuid,uuid,uuid[],text,integer,numeric)
  TO service_role;
