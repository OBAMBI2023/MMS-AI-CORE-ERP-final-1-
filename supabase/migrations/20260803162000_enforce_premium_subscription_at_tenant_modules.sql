-- Enforce active Premium subscription access at the tenant_modules boundary.
-- Covers every writer, including service_role and SQL paths outside central RPCs.

CREATE OR REPLACE FUNCTION public.tenant_has_active_premium_subscription(
  requested_tenant_id uuid,
  requested_module_id uuid
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.erp_modules module
    WHERE module.id = requested_module_id
      AND module.module_type = 'premium'
      AND (
        EXISTS (
          SELECT 1
          FROM public.tenant_module_subscriptions subscription
          WHERE subscription.tenant_id = requested_tenant_id
            AND subscription.module_id = module.id
            AND subscription.status = 'active'
            AND (subscription.expires_at IS NULL OR subscription.expires_at > now())
        )
        OR (
          module.code = 'ai_assistant'
          AND EXISTS (
            SELECT 1
            FROM public.tenant_ai_subscriptions ai_subscription
            WHERE ai_subscription.tenant_id = requested_tenant_id
              AND ai_subscription.status IN ('active', 'trial')
              AND (ai_subscription.expires_at IS NULL OR ai_subscription.expires_at > now())
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.tenant_has_active_premium_subscription(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_has_active_premium_subscription(uuid, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_active_premium_tenant_module()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_active_subscription boolean;
BEGIN
  has_active_subscription := public.tenant_has_active_premium_subscription(
    NEW.tenant_id,
    NEW.module_id
  );

  IF NOT has_active_subscription THEN
    RETURN NEW;
  END IF;

  IF NOT NEW.enabled THEN
    IF TG_OP = 'INSERT' OR OLD.enabled THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Ce module possède un abonnement actif. Suspendez ou annulez l’abonnement avant de le désactiver.';
    END IF;
    -- Repair a pre-existing inconsistent disabled row when another attribute is
    -- updated. New disabling writes are rejected by the branch above.
    NEW.enabled := true;
  END IF;

  NEW.assignment_source := 'subscription';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_active_premium_tenant_module
  ON public.tenant_modules;
CREATE TRIGGER trg_enforce_active_premium_tenant_module
  BEFORE INSERT OR UPDATE ON public.tenant_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_active_premium_tenant_module();

-- Direct tenant_module_packs writes must not downgrade subscription attribution.
CREATE OR REPLACE FUNCTION public.mark_pack_module_sources()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tenant_modules assignment
  SET assignment_source = CASE
        WHEN public.tenant_has_active_premium_subscription(
          assignment.tenant_id,
          assignment.module_id
        ) THEN 'subscription'
        ELSE 'pack'
      END,
      updated_at = now(),
      updated_by = NEW.assigned_by
  FROM public.module_pack_items item
  WHERE item.pack_id = NEW.pack_id
    AND assignment.tenant_id = NEW.tenant_id
    AND assignment.module_id = item.module_id;
  RETURN NEW;
END;
$$;

-- Pack synchronization uses the same invariant for generic and AI subscriptions.
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
      WHEN module.code = 'dashboard' THEN true
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

NOTIFY pgrst, 'reload schema';
