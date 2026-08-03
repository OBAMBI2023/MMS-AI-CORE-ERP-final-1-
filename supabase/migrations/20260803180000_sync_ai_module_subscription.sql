-- Keep the Assistant IA assignment and its dedicated subscription atomic.
-- Disabling preserves every subscription and usage row; enabling reactivates
-- the existing subscription before the tenant_modules boundary is evaluated.

CREATE OR REPLACE FUNCTION public.manage_tenant_modules(
  requested_tenant_id uuid,
  requested_changes jsonb,
  requested_actor_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_change jsonb;
  target_module public.erp_modules%ROWTYPE;
  previous_enabled boolean;
  next_enabled boolean;
  has_active_subscription boolean;
  ai_subscription_exists boolean;
BEGIN
  IF auth.uid() IS NULL OR requested_actor_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Accès refusé';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_admins administrator
    WHERE administrator.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Accès réservé aux Super Admins';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = requested_tenant_id) THEN
    RAISE EXCEPTION 'Tenant introuvable';
  END IF;
  IF jsonb_typeof(requested_changes) <> 'array' THEN
    RAISE EXCEPTION 'Liste de changements invalide';
  END IF;

  FOR requested_change IN SELECT value FROM jsonb_array_elements(requested_changes)
  LOOP
    SELECT * INTO target_module
    FROM public.erp_modules
    WHERE id = (requested_change->>'moduleId')::uuid AND is_active;
    IF target_module.id IS NULL THEN RAISE EXCEPTION 'Module actif introuvable'; END IF;

    next_enabled := (requested_change->>'enabled')::boolean;
    IF target_module.code = 'dashboard' AND NOT next_enabled THEN
      RAISE EXCEPTION 'Dashboard doit rester actif';
    END IF;

    SELECT enabled INTO previous_enabled
    FROM public.tenant_modules
    WHERE tenant_id = requested_tenant_id AND module_id = target_module.id
    FOR UPDATE;

    IF target_module.code = 'ai_assistant' THEN
      PERFORM 1 FROM public.tenant_ai_subscriptions
      WHERE tenant_id = requested_tenant_id
      FOR UPDATE;
      ai_subscription_exists := FOUND;

      IF next_enabled AND NOT ai_subscription_exists THEN
        RAISE EXCEPTION USING
          ERRCODE = 'P0001',
          MESSAGE = 'Configurez un abonnement Assistant IA avant d’activer le module.';
      END IF;

      IF next_enabled THEN
        UPDATE public.tenant_ai_subscriptions
        SET status = 'active',
            activated_at = COALESCE(activated_at, now()),
            current_period_start = CASE
              WHEN current_period_end <= now() THEN now()
              ELSE current_period_start
            END,
            current_period_end = CASE
              WHEN current_period_end <= now() THEN now() + interval '1 month'
              ELSE current_period_end
            END,
            expires_at = CASE
              WHEN expires_at IS NOT NULL AND expires_at <= now() THEN NULL
              ELSE expires_at
            END,
            updated_at = now()
        WHERE tenant_id = requested_tenant_id;
      ELSE
        UPDATE public.tenant_ai_subscriptions
        SET status = 'suspended', updated_at = now()
        WHERE tenant_id = requested_tenant_id
          AND status IN ('active', 'trial');
      END IF;
    ELSE
      SELECT public.tenant_has_active_premium_subscription(
        requested_tenant_id,
        target_module.id
      ) INTO has_active_subscription;

      IF target_module.module_type = 'premium'
         AND NOT next_enabled
         AND has_active_subscription THEN
        RAISE EXCEPTION USING
          ERRCODE = 'P0001',
          MESSAGE = 'Ce module possède un abonnement actif. Suspendez ou annulez l’abonnement avant de le désactiver.';
      END IF;
    END IF;

    INSERT INTO public.tenant_modules
      (tenant_id, module_id, enabled, assignment_source, updated_at, updated_by)
    VALUES
      (
        requested_tenant_id,
        target_module.id,
        next_enabled,
        CASE WHEN target_module.code = 'ai_assistant' AND next_enabled
          THEN 'subscription' ELSE 'manual' END,
        now(),
        auth.uid()
      )
    ON CONFLICT (tenant_id, module_id) DO UPDATE
      SET enabled = EXCLUDED.enabled,
          assignment_source = EXCLUDED.assignment_source,
          updated_at = now(),
          updated_by = auth.uid();

    IF previous_enabled IS DISTINCT FROM next_enabled THEN
      INSERT INTO public.audit_logs (user_id, action, module, entity_id, metadata)
      VALUES (
        auth.uid(),
        CASE WHEN next_enabled THEN 'tenant_module_enabled' ELSE 'tenant_module_disabled' END,
        'tenant_modules',
        requested_tenant_id::text,
        jsonb_build_object(
          'tenant_id', requested_tenant_id,
          'module_id', target_module.id,
          'module_code', target_module.code,
          'previous_enabled', previous_enabled,
          'enabled', next_enabled,
          'source', CASE WHEN target_module.code = 'ai_assistant' AND next_enabled
            THEN 'subscription' ELSE 'manual' END
        )
      );
    END IF;
  END LOOP;
END;
$$;

-- Repair legacy contradictions without deleting subscriptions, usage or module rows.
UPDATE public.tenant_modules assignment
SET enabled = false,
    assignment_source = 'manual',
    updated_at = now()
FROM public.erp_modules module
WHERE assignment.module_id = module.id
  AND module.code = 'ai_assistant'
  AND assignment.enabled
  AND NOT EXISTS (
    SELECT 1
    FROM public.tenant_ai_subscriptions subscription
    WHERE subscription.tenant_id = assignment.tenant_id
      AND subscription.status IN ('active', 'trial')
      AND (subscription.expires_at IS NULL OR subscription.expires_at > now())
  );

UPDATE public.tenant_modules assignment
SET enabled = true,
    assignment_source = 'subscription',
    updated_at = now()
FROM public.erp_modules module
WHERE assignment.module_id = module.id
  AND module.code = 'ai_assistant'
  AND NOT assignment.enabled
  AND EXISTS (
    SELECT 1
    FROM public.tenant_ai_subscriptions subscription
    WHERE subscription.tenant_id = assignment.tenant_id
      AND subscription.status IN ('active', 'trial')
      AND (subscription.expires_at IS NULL OR subscription.expires_at > now())
  );

REVOKE ALL ON FUNCTION public.manage_tenant_modules(uuid, jsonb, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_tenant_modules(uuid, jsonb, uuid)
  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
