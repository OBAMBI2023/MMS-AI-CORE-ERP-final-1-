-- Central, audited tenant-module management. Additive and safe to replay.
ALTER TABLE public.erp_modules
  ADD COLUMN IF NOT EXISTS module_type text NOT NULL DEFAULT 'standard';

ALTER TABLE public.erp_modules
  DROP CONSTRAINT IF EXISTS erp_modules_module_type_check;
ALTER TABLE public.erp_modules
  ADD CONSTRAINT erp_modules_module_type_check
  CHECK (module_type IN ('standard', 'premium'));

ALTER TABLE public.tenant_modules
  ADD COLUMN IF NOT EXISTS assignment_source text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.tenant_modules
  DROP CONSTRAINT IF EXISTS tenant_modules_assignment_source_check;
ALTER TABLE public.tenant_modules
  ADD CONSTRAINT tenant_modules_assignment_source_check
  CHECK (assignment_source IN ('pack', 'manual', 'subscription', 'system'));

UPDATE public.erp_modules
SET module_type = 'premium'
WHERE code IN ('hotel_sms', 'ai_assistant');

UPDATE public.erp_modules
SET name = 'SMS', description = 'Envoi de SMS aux clients', module_type = 'premium', is_active = true
WHERE code = 'hotel_sms';

UPDATE public.tenant_modules tm
SET assignment_source = CASE
  WHEN EXISTS (
    SELECT 1 FROM public.tenant_module_subscriptions subscription
    WHERE subscription.tenant_id = tm.tenant_id AND subscription.module_id = tm.module_id
  ) THEN 'subscription'
  WHEN EXISTS (
    SELECT 1 FROM public.tenant_module_packs tenant_pack
    JOIN public.module_pack_items item ON item.pack_id = tenant_pack.pack_id
    WHERE tenant_pack.tenant_id = tm.tenant_id AND item.module_id = tm.module_id
  ) THEN 'pack'
  ELSE 'system'
END;

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

    -- The existing premium trigger validates SMS subscription validity. This
    -- assignment only changes access and never creates or credits a subscription.
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

REVOKE ALL ON FUNCTION public.manage_tenant_modules(uuid, jsonb, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_tenant_modules(uuid, jsonb, uuid)
  TO authenticated, service_role;

-- Keep pack attribution metadata accurate without changing subscription state.
CREATE OR REPLACE FUNCTION public.mark_pack_module_sources()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.tenant_modules assignment
  SET assignment_source = 'pack', updated_at = now(), updated_by = NEW.assigned_by
  FROM public.module_pack_items item
  WHERE item.pack_id = NEW.pack_id
    AND assignment.tenant_id = NEW.tenant_id
    AND assignment.module_id = item.module_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_mark_pack_module_sources ON public.tenant_module_packs;
CREATE TRIGGER trg_mark_pack_module_sources
  AFTER INSERT OR UPDATE OF pack_id ON public.tenant_module_packs
  FOR EACH ROW EXECUTE FUNCTION public.mark_pack_module_sources();

CREATE OR REPLACE FUNCTION public.assign_module_pack_to_tenant(
  requested_tenant_id uuid,
  requested_pack_id uuid,
  requested_by uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  INSERT INTO public.tenant_module_packs (tenant_id, pack_id, assigned_at, assigned_by)
  VALUES (requested_tenant_id, requested_pack_id, now(), requested_by)
  ON CONFLICT (tenant_id) DO UPDATE
    SET pack_id = EXCLUDED.pack_id, assigned_at = now(), assigned_by = EXCLUDED.assigned_by;

  INSERT INTO public.tenant_modules
    (tenant_id, module_id, enabled, assignment_source, updated_at, updated_by)
  SELECT requested_tenant_id, module.id,
    CASE
      WHEN module.code = 'dashboard' THEN true
      WHEN NOT EXISTS (
        SELECT 1 FROM public.module_pack_items item
        WHERE item.pack_id = requested_pack_id AND item.module_id = module.id
      ) THEN false
      WHEN module.module_type = 'standard' THEN true
      ELSE EXISTS (
        SELECT 1 FROM public.tenant_module_subscriptions subscription
        WHERE subscription.tenant_id = requested_tenant_id
          AND subscription.module_id = module.id
          AND subscription.status = 'active'
          AND (subscription.expires_at IS NULL OR subscription.expires_at > now())
      )
    END,
    'pack', now(), requested_by
  FROM public.erp_modules module
  ON CONFLICT (tenant_id, module_id) DO UPDATE
    SET enabled = EXCLUDED.enabled, assignment_source = 'pack',
        updated_at = now(), updated_by = requested_by;

  INSERT INTO public.audit_logs (user_id, action, module, entity_id, metadata)
  VALUES (requested_by, 'tenant_module_pack_assigned', 'tenant_modules', requested_tenant_id::text,
    jsonb_build_object('tenant_id', requested_tenant_id, 'pack_id', requested_pack_id));
END;
$$;

NOTIFY pgrst, 'reload schema';
