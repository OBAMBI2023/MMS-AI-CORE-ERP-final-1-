-- Extend system-module protection from 'dashboard' only to every core module a
-- tenant needs to reach its own workspace: dashboard/settings for ERP tenants
-- and hotel_dashboard/hotel_settings for Hotel tenants. Additive only: no
-- existing migration is modified, no data is deleted, no subscription or
-- credit state is touched.

-- 1) Friendly pre-check in the manual Super Admin toggle RPC.
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
    IF target_module.code = ANY (ARRAY['dashboard', 'settings', 'hotel_dashboard', 'hotel_settings'])
       AND NOT next_enabled THEN
      RAISE EXCEPTION 'Ce module système doit rester actif';
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

REVOKE ALL ON FUNCTION public.manage_tenant_modules(uuid, jsonb, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_tenant_modules(uuid, jsonb, uuid)
  TO authenticated, service_role;

-- 2) Pack assignment must never turn off a system module the pack omits.
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
  WHERE public.tenant_has_active_premium_subscription(requested_tenant_id, module.id)
    AND NOT EXISTS (
      SELECT 1 FROM public.module_pack_items item
      WHERE item.pack_id = requested_pack_id AND item.module_id = module.id
    );

  INSERT INTO public.tenant_module_packs (tenant_id, pack_id, assigned_at, assigned_by)
  VALUES (requested_tenant_id, requested_pack_id, now(), requested_by)
  ON CONFLICT (tenant_id) DO UPDATE
    SET pack_id = EXCLUDED.pack_id,
        assigned_at = now(),
        assigned_by = EXCLUDED.assigned_by;

  INSERT INTO public.tenant_modules
    (tenant_id, module_id, enabled, assignment_source, updated_at, updated_by)
  SELECT requested_tenant_id,
    module.id,
    CASE
      WHEN module.code = ANY (ARRAY['dashboard', 'settings', 'hotel_dashboard', 'hotel_settings']) THEN true
      WHEN public.tenant_has_active_premium_subscription(requested_tenant_id, module.id) THEN true
      WHEN NOT EXISTS (
        SELECT 1 FROM public.module_pack_items item
        WHERE item.pack_id = requested_pack_id AND item.module_id = module.id
      ) THEN false
      WHEN module.module_type = 'standard' THEN true
      ELSE false
    END,
    CASE
      WHEN public.tenant_has_active_premium_subscription(requested_tenant_id, module.id)
        THEN 'subscription'
      ELSE 'pack'
    END,
    now(),
    requested_by
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

REVOKE ALL ON FUNCTION public.assign_module_pack_to_tenant(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_module_pack_to_tenant(uuid, uuid, uuid)
  TO service_role;

-- 3) Table-level boundary: reject disabling, deleting or re-keying a system
-- module assignment through ANY writer (RPC, service_role, future code).
CREATE OR REPLACE FUNCTION public.enforce_active_premium_tenant_module()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_has_active_subscription boolean := false;
  new_has_active_subscription boolean := false;
  old_module_code text;
  new_module_code text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT code INTO old_module_code FROM public.erp_modules WHERE id = OLD.module_id;
    IF OLD.enabled AND old_module_code = ANY (ARRAY['dashboard', 'settings', 'hotel_dashboard', 'hotel_settings']) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Ce module système ne peut pas être supprimé.';
    END IF;

    old_has_active_subscription := public.tenant_has_active_premium_subscription(
      OLD.tenant_id,
      OLD.module_id
    );

    IF OLD.enabled AND old_has_active_subscription THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Ce module possède un abonnement actif. Suspendez ou annulez l’abonnement avant de le supprimer.';
    END IF;

    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE'
    AND (
      OLD.tenant_id IS DISTINCT FROM NEW.tenant_id
      OR OLD.module_id IS DISTINCT FROM NEW.module_id
    )
  THEN
    SELECT code INTO old_module_code FROM public.erp_modules WHERE id = OLD.module_id;
    IF OLD.enabled AND old_module_code = ANY (ARRAY['dashboard', 'settings', 'hotel_dashboard', 'hotel_settings']) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Ce module système ne peut pas être réaffecté.';
    END IF;

    old_has_active_subscription := public.tenant_has_active_premium_subscription(
      OLD.tenant_id,
      OLD.module_id
    );

    IF OLD.enabled AND old_has_active_subscription THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Ce module possède un abonnement actif. Suspendez ou annulez l’abonnement avant de modifier son affectation.';
    END IF;
  END IF;

  SELECT code INTO new_module_code FROM public.erp_modules WHERE id = NEW.module_id;
  IF NOT NEW.enabled AND new_module_code = ANY (ARRAY['dashboard', 'settings', 'hotel_dashboard', 'hotel_settings']) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Ce module système ne peut pas être désactivé.';
  END IF;

  new_has_active_subscription := public.tenant_has_active_premium_subscription(
    NEW.tenant_id,
    NEW.module_id
  );

  IF NOT new_has_active_subscription THEN
    RETURN NEW;
  END IF;

  IF NOT NEW.enabled THEN
    IF TG_OP = 'INSERT' OR OLD.enabled THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Ce module possède un abonnement actif. Suspendez ou annulez l’abonnement avant de le désactiver.';
    END IF;

    -- Repair an already inconsistent disabled assignment on unrelated updates.
    NEW.enabled := true;
  END IF;

  NEW.assignment_source := 'subscription';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_active_premium_tenant_module
  ON public.tenant_modules;
CREATE TRIGGER trg_enforce_active_premium_tenant_module
  BEFORE INSERT OR UPDATE OR DELETE ON public.tenant_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_active_premium_tenant_module();

NOTIFY pgrst, 'reload schema';
