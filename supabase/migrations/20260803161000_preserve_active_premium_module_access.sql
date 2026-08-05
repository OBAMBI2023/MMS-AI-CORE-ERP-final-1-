-- Prevent module access from diverging from active Premium subscriptions.
-- This migration supersedes only the central management functions introduced
-- by 20260803160000; the already deployed migration remains unchanged.

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

    SELECT EXISTS (
      SELECT 1
      FROM public.tenant_module_subscriptions subscription
      WHERE subscription.tenant_id = requested_tenant_id
        AND subscription.module_id = target_module.id
        AND subscription.status = 'active'
        AND (subscription.expires_at IS NULL OR subscription.expires_at > now())
    ) INTO has_active_subscription;

    IF target_module.module_type = 'premium'
       AND NOT next_enabled
       AND has_active_subscription THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Ce module possède un abonnement actif. Suspendez ou annulez l’abonnement avant de le désactiver.';
    END IF;

    SELECT enabled INTO previous_enabled
    FROM public.tenant_modules
    WHERE tenant_id = requested_tenant_id AND module_id = target_module.id
    FOR UPDATE;

    INSERT INTO public.tenant_modules
      (tenant_id, module_id, enabled, assignment_source, updated_at, updated_by)
    VALUES
      (requested_tenant_id, target_module.id, next_enabled, 'manual', now(), auth.uid())
    ON CONFLICT (tenant_id, module_id) DO UPDATE
      SET enabled = EXCLUDED.enabled,
          assignment_source = 'manual',
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
          'source', 'manual'
        )
      );
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_module_pack_to_tenant(
  requested_tenant_id uuid,
  requested_pack_id uuid,
  requested_by uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  preserved_premium_modules jsonb;
BEGIN
  IF NOT public.is_platform_admin_actor(requested_by) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Accès réservé aux Super Admins';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = requested_tenant_id) THEN
    RAISE EXCEPTION 'Tenant introuvable';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.module_packs WHERE id = requested_pack_id AND is_active) THEN
    RAISE EXCEPTION 'Pack actif introuvable';
  END IF;


  SELECT COALESCE(jsonb_agg(module.code ORDER BY module.sort_order), '[]'::jsonb)
  INTO preserved_premium_modules
  FROM public.erp_modules module
  WHERE module.module_type = 'premium'
    AND NOT EXISTS (
      SELECT 1 FROM public.module_pack_items item
      WHERE item.pack_id = requested_pack_id AND item.module_id = module.id
    )
    AND EXISTS (
      SELECT 1 FROM public.tenant_module_subscriptions subscription
      WHERE subscription.tenant_id = requested_tenant_id
        AND subscription.module_id = module.id
        AND subscription.status = 'active'
        AND (subscription.expires_at IS NULL OR subscription.expires_at > now())
    );

  INSERT INTO public.tenant_module_packs (tenant_id, pack_id, assigned_at, assigned_by)
  VALUES (requested_tenant_id, requested_pack_id, now(), requested_by)
  ON CONFLICT (tenant_id) DO UPDATE
    SET pack_id = EXCLUDED.pack_id, assigned_at = now(), assigned_by = EXCLUDED.assigned_by;

  INSERT INTO public.tenant_modules
    (tenant_id, module_id, enabled, assignment_source, updated_at, updated_by)
  SELECT requested_tenant_id, module.id,
    CASE
      WHEN module.code = 'dashboard' THEN true
      WHEN module.module_type = 'premium' AND EXISTS (
        SELECT 1 FROM public.tenant_module_subscriptions subscription
        WHERE subscription.tenant_id = requested_tenant_id
          AND subscription.module_id = module.id
          AND subscription.status = 'active'
          AND (subscription.expires_at IS NULL OR subscription.expires_at > now())
      ) THEN true
      WHEN NOT EXISTS (
        SELECT 1 FROM public.module_pack_items item
        WHERE item.pack_id = requested_pack_id AND item.module_id = module.id
      ) THEN false
      WHEN module.module_type = 'standard' THEN true
      ELSE false
    END,
    CASE
      WHEN module.module_type = 'premium' AND EXISTS (
        SELECT 1 FROM public.tenant_module_subscriptions subscription
        WHERE subscription.tenant_id = requested_tenant_id
          AND subscription.module_id = module.id
          AND subscription.status = 'active'
          AND (subscription.expires_at IS NULL OR subscription.expires_at > now())
      ) THEN 'subscription'
      ELSE 'pack'
    END,
    now(), requested_by
  FROM public.erp_modules module
  ON CONFLICT (tenant_id, module_id) DO UPDATE
    SET enabled = EXCLUDED.enabled,
        assignment_source = EXCLUDED.assignment_source,
        updated_at = now(),
        updated_by = requested_by;

  INSERT INTO public.audit_logs (user_id, action, module, entity_id, metadata)
  VALUES (
    requested_by,
    'tenant_module_pack_assigned',
    'tenant_modules',
    requested_tenant_id::text,
    jsonb_build_object(
      'tenant_id', requested_tenant_id,
      'pack_id', requested_pack_id,
      'preserved_active_premium_modules', preserved_premium_modules
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.manage_tenant_modules(uuid, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_tenant_modules(uuid, jsonb, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.assign_module_pack_to_tenant(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_module_pack_to_tenant(uuid, uuid, uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
