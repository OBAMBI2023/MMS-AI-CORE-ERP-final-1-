-- Wires Support and Prestataires (hotel_maintenance) into the existing
-- remote module-management system (erp_modules / tenant_modules /
-- module_packs / assign_module_pack_to_tenant / manageTenantModule), so the
-- Super Admin's already-built "Contrôle des modules" panel
-- (TenantModuleControlPanel.tsx) can toggle them per tenant. No new tables:
-- this only registers Support in the existing catalog, fixes one
-- misconfigured pack, extends one existing function, backfills missing
-- default assignments, and adds a module-enabled gate to the Support RLS/RPCs
-- that were previously always-on (support was built before this task asked
-- for it to become a toggleable module).

-- 1. Register Support in the module catalog (Prestataires/hotel_maintenance
-- already exists — see 20260803020000_create_hotel_maintenance_providers.sql).
INSERT INTO public.erp_modules (code, name, description, icon, sort_order, module_type, is_active)
VALUES ('support', 'Support', 'Échanges avec l''équipe SAOVIA', 'LifeBuoy', 131, 'standard', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  is_active = true;

-- 2. "Pack Commerce générale" (auto-assigned to every new ERP free-trial
-- tenant) incorrectly includes hotel_maintenance — a HOTEL-only module per
-- business rules. This is why several non-hotel tenants currently show it as
-- enabled (harmless in practice: hotel_permission_for() already blocks real
-- access via its own platform_type='HOTEL' check), but it must stop being
-- assigned to new ERP tenants and must not be offered as "eligible" in the
-- Super Admin console. Existing stray tenant_modules rows for non-hotel
-- tenants are intentionally left untouched here (out of scope, harmless,
-- and RLS-blocked regardless) — only the pack composition is fixed so this
-- doesn't keep happening for new tenants.
DELETE FROM public.module_pack_items
WHERE pack_id = (SELECT id FROM public.module_packs WHERE code = 'commerce_generale')
  AND module_id = (SELECT id FROM public.erp_modules WHERE code = 'hotel_maintenance');

-- 3. assign_module_pack_to_tenant() already special-cases 'dashboard' to be
-- enabled for every tenant regardless of pack contents. Support should get
-- the exact same treatment (all tenants, every pack, present or future) —
-- this is the single change that makes "attribuer Support à tous les
-- tenants" true for every current tenant-creation flow that ends up calling
-- this shared function (trial signup, super-admin invitation, dual
-- onboarding, manual pack assignment), without touching each of those flows
-- individually. Body otherwise identical to the version created in
-- 20260803162000_enforce_premium_subscription_at_tenant_modules.sql.
CREATE OR REPLACE FUNCTION public.assign_module_pack_to_tenant(
  requested_tenant_id uuid,
  requested_pack_id uuid,
  requested_by uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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
      WHEN module.code IN ('dashboard', 'support') THEN true
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
$function$;

-- 4. Idempotent backfill for existing tenants — DO NOTHING on conflict so a
-- tenant an admin already explicitly disabled Support/Prestataires for is
-- never silently re-enabled by re-running this migration.
INSERT INTO public.tenant_modules (tenant_id, module_id, enabled, assignment_source, updated_at)
SELECT t.id, m.id, true, 'system', now()
FROM public.tenants t
CROSS JOIN public.erp_modules m
WHERE m.code = 'support' AND t.deleted_at IS NULL
ON CONFLICT (tenant_id, module_id) DO NOTHING;

INSERT INTO public.tenant_modules (tenant_id, module_id, enabled, assignment_source, updated_at)
SELECT t.id, m.id, true, 'system', now()
FROM public.tenants t
CROSS JOIN public.erp_modules m
WHERE m.code = 'hotel_maintenance' AND t.platform_type = 'HOTEL' AND t.deleted_at IS NULL
ON CONFLICT (tenant_id, module_id) DO NOTHING;

-- 5. Support was originally built as an always-on, non-toggleable feature
-- (see 20260810160000_create_support_module.sql), so its RLS/RPCs never
-- checked module enablement. Now that it's a real toggle, add
-- current_user_module_enabled('support') everywhere has_permission('support.*')
-- was already checked on the TENANT branch — the platform-admin branch is
-- intentionally left alone (SAOVIA staff can still see/manage a tenant's
-- historical tickets even after Support is disabled for that tenant going
-- forward).
DROP POLICY IF EXISTS "support_tickets_select" ON public.support_tickets;
CREATE POLICY "support_tickets_select" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (
    (tenant_id = public.current_tenant_id()
      AND public.has_permission('support.view')
      AND public.current_user_module_enabled('support'))
    OR EXISTS (SELECT 1 FROM public.platform_admins admin WHERE admin.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "support_messages_select" ON public.support_messages;
CREATE POLICY "support_messages_select" ON public.support_messages
  FOR SELECT TO authenticated
  USING (
    (tenant_id = public.current_tenant_id()
      AND public.has_permission('support.view')
      AND public.current_user_module_enabled('support'))
    OR EXISTS (SELECT 1 FROM public.platform_admins admin WHERE admin.user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.create_support_ticket(
  requested_subject text,
  requested_category text,
  requested_priority text,
  requested_message text,
  requested_attachment_path text DEFAULT NULL,
  requested_attachment_name text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_ticket_id uuid;
  tenant uuid := public.current_tenant_id();
BEGIN
  IF tenant IS NULL
    OR NOT public.has_permission('support.create')
    OR NOT public.current_user_module_enabled('support') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Permission requise pour créer un ticket.';
  END IF;
  IF btrim(coalesce(requested_subject, '')) = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Le sujet est obligatoire.';
  END IF;
  IF btrim(coalesce(requested_message, '')) = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Le message est obligatoire.';
  END IF;

  INSERT INTO public.support_tickets (tenant_id, created_by, subject, category, priority, status)
  VALUES (tenant, auth.uid(), btrim(requested_subject), requested_category, requested_priority, 'open')
  RETURNING id INTO new_ticket_id;

  INSERT INTO public.support_messages
    (ticket_id, tenant_id, sender_user_id, sender_type, message, attachment_path, attachment_name)
  VALUES
    (new_ticket_id, tenant, auth.uid(), 'tenant', btrim(requested_message), requested_attachment_path, requested_attachment_name);

  RETURN new_ticket_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reply_support_ticket(
  requested_ticket_id uuid,
  requested_message text,
  requested_attachment_path text DEFAULT NULL,
  requested_attachment_name text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_message_id uuid;
  tenant uuid := public.current_tenant_id();
BEGIN
  IF tenant IS NULL
    OR NOT public.has_permission('support.view')
    OR NOT public.current_user_module_enabled('support') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Permission requise pour répondre à ce ticket.';
  END IF;
  IF btrim(coalesce(requested_message, '')) = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Le message est obligatoire.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = requested_ticket_id AND t.tenant_id = tenant
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Ticket introuvable ou accès refusé.';
  END IF;

  INSERT INTO public.support_messages
    (ticket_id, tenant_id, sender_user_id, sender_type, message, attachment_path, attachment_name)
  VALUES
    (requested_ticket_id, tenant, auth.uid(), 'tenant', btrim(requested_message), requested_attachment_path, requested_attachment_name)
  RETURNING id INTO new_message_id;

  RETURN new_message_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_support_ticket(requested_ticket_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_permission('support.view') OR NOT public.current_user_module_enabled('support') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Permission requise pour fermer ce ticket.';
  END IF;
  UPDATE public.support_tickets
  SET status = 'closed'
  WHERE id = requested_ticket_id AND tenant_id = public.current_tenant_id();
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Ticket introuvable ou accès refusé.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.reopen_support_ticket(requested_ticket_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_permission('support.view') OR NOT public.current_user_module_enabled('support') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Permission requise pour rouvrir ce ticket.';
  END IF;
  UPDATE public.support_tickets
  SET status = 'open'
  WHERE id = requested_ticket_id
    AND tenant_id = public.current_tenant_id()
    AND status IN ('resolved', 'closed');
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Ticket introuvable, accès refusé, ou déjà ouvert.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_support_messages_read(requested_ticket_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  tenant uuid := public.current_tenant_id();
  is_admin_actor boolean := EXISTS (
    SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = auth.uid()
  );
BEGIN
  IF is_admin_actor THEN
    UPDATE public.support_messages
    SET read_at = now()
    WHERE ticket_id = requested_ticket_id AND sender_type = 'tenant' AND read_at IS NULL;
  ELSIF tenant IS NOT NULL
    AND public.has_permission('support.view')
    AND public.current_user_module_enabled('support') THEN
    UPDATE public.support_messages
    SET read_at = now()
    WHERE ticket_id = requested_ticket_id
      AND tenant_id = tenant
      AND sender_type = 'support'
      AND read_at IS NULL;
  ELSE
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Accès refusé.';
  END IF;
END;
$$;
