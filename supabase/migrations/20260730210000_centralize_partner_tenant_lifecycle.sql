-- Centralise tenant lifecycle operations in the platform administration.
-- Physical deletion remains a separate, exceptional maintenance operation.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS deletion_reason text,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by uuid,
  ADD COLUMN IF NOT EXISTS suspension_reason text;

CREATE INDEX IF NOT EXISTS tenants_active_lifecycle_idx
  ON public.tenants (is_active, deleted_at);

CREATE OR REPLACE FUNCTION public.tenant_has_current_access(requested_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenants tenant
    JOIN public.subscriptions subscription ON subscription.tenant_id = tenant.id
    WHERE tenant.id = requested_tenant_id
      AND tenant.deleted_at IS NULL
      AND tenant.is_active
      AND subscription.status IN ('active', 'trial')
      AND CASE
        WHEN subscription.status = 'trial'
          THEN subscription.trial_ends_at IS NOT NULL AND subscription.trial_ends_at > now()
        ELSE subscription.ends_at IS NOT NULL AND subscription.ends_at > now()
      END
  )
$$;

REVOKE ALL ON FUNCTION public.tenant_has_current_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tenant_has_current_access(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT profile.tenant_id
  FROM public.profiles profile
  WHERE profile.id = auth.uid()
    AND public.tenant_has_current_access(profile.tenant_id)
$$;

REVOKE ALL ON FUNCTION public.current_tenant_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_tenant_id() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.profiles profile
    JOIN public.roles role
      ON role.id = profile.role_id AND role.tenant_id = profile.tenant_id
    WHERE profile.id = auth.uid()
      AND role.name IN ('Administrateur', 'Super Admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.has_permission(required_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_tenant_id() IS NOT NULL AND (
    public.is_admin() OR EXISTS (
      SELECT 1
      FROM public.profiles profile
      JOIN public.role_permissions assignment ON assignment.role_id = profile.role_id
      JOIN public.permissions permission ON permission.id = assignment.permission_id
      WHERE profile.id = auth.uid()
        AND profile.tenant_id = public.current_tenant_id()
        AND permission.code = required_permission
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.current_user_module_enabled(requested_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_modules assignment
    JOIN public.erp_modules module ON module.id = assignment.module_id
    WHERE assignment.tenant_id = public.current_tenant_id()
      AND module.code = requested_code
      AND module.is_active
      AND assignment.enabled
  )
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_module_assignment(requested_module_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_modules assignment
    WHERE assignment.tenant_id = public.current_tenant_id()
      AND assignment.module_id = requested_module_id
      AND assignment.enabled
  )
$$;

-- Service-role business functions accept explicit IDs, so protect them too:
-- an application session must not bypass lifecycle checks through the server.
ALTER FUNCTION public.reserve_ai_request(uuid, uuid, text)
  RENAME TO reserve_ai_request_active_tenant_core;

REVOKE ALL ON FUNCTION public.reserve_ai_request_active_tenant_core(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.reserve_ai_request(
  p_tenant_id uuid,
  p_user_id uuid,
  p_request_type text
)
RETURNS TABLE (
  allowed boolean, reason text, usage_log_id uuid, plan_code text,
  monthly_request_limit integer, requests_used integer,
  current_period_start timestamptz, current_period_end timestamptz,
  subscription_status text, expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.tenant_has_current_access(p_tenant_id)
     OR NOT EXISTS (
       SELECT 1 FROM public.profiles profile
       WHERE profile.id = p_user_id AND profile.tenant_id = p_tenant_id
     )
  THEN
    RAISE EXCEPTION 'Accès refusé : tenant inactif, supprimé ou sans licence valide.';
  END IF;
  RETURN QUERY
    SELECT * FROM public.reserve_ai_request_active_tenant_core(
      p_tenant_id, p_user_id, p_request_type
    );
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_ai_request(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_request(uuid, uuid, text) TO service_role;
REVOKE ALL ON FUNCTION public.reserve_ai_request_active_tenant_core(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;

ALTER FUNCTION public.get_ai_subscription_state(uuid, uuid)
  RENAME TO get_ai_subscription_state_active_tenant_core;

REVOKE ALL ON FUNCTION public.get_ai_subscription_state_active_tenant_core(uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.get_ai_subscription_state(p_tenant_id uuid, p_user_id uuid)
RETURNS TABLE (
  module_enabled boolean, permission_granted boolean, plan_code text, plan_name text,
  status text, monthly_request_limit integer, requests_used integer,
  current_period_start timestamptz, current_period_end timestamptz, expires_at timestamptz,
  valid boolean, quota_exhausted boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT public.tenant_has_current_access(p_tenant_id)
     OR NOT EXISTS (
       SELECT 1 FROM public.profiles profile
       WHERE profile.id = p_user_id AND profile.tenant_id = p_tenant_id
     )
  THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT * FROM public.get_ai_subscription_state_active_tenant_core(p_tenant_id, p_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.get_ai_subscription_state(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_subscription_state(uuid, uuid) TO service_role;
REVOKE ALL ON FUNCTION public.get_ai_subscription_state_active_tenant_core(uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;

DROP POLICY IF EXISTS "tenants_read_own_profile_tenant" ON public.tenants;
CREATE POLICY "tenants_read_own_profile_tenant"
ON public.tenants FOR SELECT TO authenticated
USING (
  public.tenant_has_current_access(tenants.id)
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.tenant_id = tenants.id
  )
);

DROP POLICY IF EXISTS "profiles_read_own_or_tenant_admin" ON public.profiles;
CREATE POLICY "profiles_read_own_or_tenant_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (auth.uid() = id OR public.is_admin())
  );

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id AND tenant_id = public.current_tenant_id())
  WITH CHECK (auth.uid() = id AND tenant_id = public.current_tenant_id());

-- Keep the historical policy names during the transition. Legacy objects use
-- logo|signature|stamp/<settingsId>-..., and settingsId is accepted only when
-- public.parametres proves that it belongs to the current active tenant.
UPDATE storage.buckets
SET public = false
WHERE id = 'company-assets';

ALTER POLICY "company-assets read" ON storage.objects TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND (
      (storage.foldername(name))[1] = public.current_tenant_id()::text
      OR EXISTS (
        SELECT 1
        FROM public.parametres settings
        WHERE settings.tenant_id = public.current_tenant_id()
          AND (storage.foldername(name))[1] IN ('logo', 'signature', 'stamp')
          AND split_part(name, '/', 2) LIKE settings.id::text || '-%'
      )
    )
  );
ALTER POLICY "company-assets insert" ON storage.objects TO authenticated
  WITH CHECK (
    bucket_id = 'company-assets'
    AND (
      (storage.foldername(name))[1] = public.current_tenant_id()::text
      OR EXISTS (
        SELECT 1 FROM public.parametres settings
        WHERE settings.tenant_id = public.current_tenant_id()
          AND (storage.foldername(name))[1] IN ('logo', 'signature', 'stamp')
          AND split_part(name, '/', 2) LIKE settings.id::text || '-%'
      )
    )
  );
ALTER POLICY "company-assets update" ON storage.objects TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND (
      (storage.foldername(name))[1] = public.current_tenant_id()::text
      OR EXISTS (
        SELECT 1 FROM public.parametres settings
        WHERE settings.tenant_id = public.current_tenant_id()
          AND (storage.foldername(name))[1] IN ('logo', 'signature', 'stamp')
          AND split_part(name, '/', 2) LIKE settings.id::text || '-%'
      )
    )
  )
  WITH CHECK (
    bucket_id = 'company-assets'
    AND (
      (storage.foldername(name))[1] = public.current_tenant_id()::text
      OR EXISTS (
        SELECT 1 FROM public.parametres settings
        WHERE settings.tenant_id = public.current_tenant_id()
          AND (storage.foldername(name))[1] IN ('logo', 'signature', 'stamp')
          AND split_part(name, '/', 2) LIKE settings.id::text || '-%'
      )
    )
  );
ALTER POLICY "company-assets delete" ON storage.objects TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND (
      (storage.foldername(name))[1] = public.current_tenant_id()::text
      OR EXISTS (
        SELECT 1 FROM public.parametres settings
        WHERE settings.tenant_id = public.current_tenant_id()
          AND (storage.foldername(name))[1] IN ('logo', 'signature', 'stamp')
          AND split_part(name, '/', 2) LIKE settings.id::text || '-%'
      )
    )
  );

CREATE TABLE IF NOT EXISTS public.tenant_lifecycle_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  partner_id uuid,
  action text NOT NULL CHECK (action IN ('updated', 'suspended', 'reactivated', 'soft_deleted', 'restored')),
  reason text NOT NULL,
  dependency_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_lifecycle_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tenant_lifecycle_audit FROM anon, authenticated;
GRANT ALL ON TABLE public.tenant_lifecycle_audit TO service_role;

CREATE OR REPLACE FUNCTION public.assert_platform_admin(requested_actor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF requested_actor_id IS NULL
     OR requested_actor_id IS DISTINCT FROM auth.uid()
     OR NOT EXISTS (
       SELECT 1 FROM public.platform_admins admin
       WHERE admin.user_id = requested_actor_id
     )
  THEN
    RAISE EXCEPTION 'Accès refusé : super administrateur requis.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_platform_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_platform_admin(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.tenant_dependency_snapshot(requested_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate record;
  row_count bigint;
  snapshot jsonb := '{}'::jsonb;
BEGIN
  FOR candidate IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'tenant_id'
      AND t.table_type = 'BASE TABLE'
      AND c.table_name NOT IN ('tenants', 'tenant_deletion_jobs')
    ORDER BY c.table_name
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id = $1', candidate.table_name)
      INTO row_count USING requested_tenant_id;
    snapshot := snapshot || jsonb_build_object(candidate.table_name, row_count);
  END LOOP;
  RETURN snapshot;
END;
$$;

REVOKE ALL ON FUNCTION public.tenant_dependency_snapshot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tenant_dependency_snapshot(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.manage_tenant_lifecycle(
  requested_tenant_id uuid,
  requested_actor_id uuid,
  requested_action text,
  requested_reason text,
  requested_exact_name text DEFAULT NULL,
  requested_second_confirmation text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target public.tenants%ROWTYPE;
  creator_partner_id uuid;
  dependencies jsonb := '{}'::jsonb;
  has_current_license boolean := false;
BEGIN
  PERFORM public.assert_platform_admin(requested_actor_id);
  IF length(btrim(coalesce(requested_reason, ''))) < 3 THEN
    RAISE EXCEPTION 'Un motif d’au moins 3 caractères est obligatoire.';
  END IF;

  SELECT * INTO target FROM public.tenants
  WHERE id = requested_tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tenant introuvable.'; END IF;

  SELECT assignment.partner_id INTO creator_partner_id
  FROM public.partner_tenants assignment
  WHERE assignment.tenant_id = target.id
  ORDER BY assignment.assigned_at ASC
  LIMIT 1;

  IF requested_action = 'soft_delete' THEN
    IF target.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'Ce tenant est déjà supprimé.';
    END IF;
    IF requested_exact_name IS DISTINCT FROM target.name THEN
      RAISE EXCEPTION 'Le nom de confirmation ne correspond pas exactement.';
    END IF;
    IF requested_second_confirmation IS DISTINCT FROM 'CONFIRMER LA SUPPRESSION' THEN
      RAISE EXCEPTION 'La seconde confirmation explicite est obligatoire.';
    END IF;
    dependencies := public.tenant_dependency_snapshot(target.id);
    UPDATE public.tenants SET
      is_active = false,
      deleted_at = coalesce(deleted_at, now()),
      deleted_by = requested_actor_id,
      deletion_reason = btrim(requested_reason)
    WHERE id = target.id;
  ELSIF requested_action = 'restore' THEN
    IF target.deleted_at IS NULL THEN RAISE EXCEPTION 'Ce tenant n’est pas supprimé.'; END IF;
    UPDATE public.tenants SET
      is_active = (
        suspended_at IS NULL
        AND EXISTS (
          SELECT 1 FROM public.subscriptions subscription
          WHERE subscription.tenant_id = target.id
            AND subscription.status IN ('active', 'trial')
            AND CASE
              WHEN subscription.status = 'trial'
                THEN subscription.trial_ends_at IS NOT NULL AND subscription.trial_ends_at > now()
              ELSE subscription.ends_at IS NOT NULL AND subscription.ends_at > now()
            END
        )
      ),
      deleted_at = NULL, deleted_by = NULL, deletion_reason = NULL
    WHERE id = target.id;
  ELSIF requested_action = 'suspend' THEN
    IF target.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Un tenant supprimé ne peut pas être suspendu.'; END IF;
    UPDATE public.tenants SET
      is_active = false, suspended_at = now(), suspended_by = requested_actor_id,
      suspension_reason = btrim(requested_reason)
    WHERE id = target.id;
  ELSIF requested_action = 'reactivate' THEN
    IF target.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Restaurez d’abord ce tenant.'; END IF;
    SELECT EXISTS (
      SELECT 1 FROM public.subscriptions subscription
      WHERE subscription.tenant_id = target.id
        AND subscription.status IN ('active', 'trial')
        AND CASE
          WHEN subscription.status = 'trial'
            THEN subscription.trial_ends_at IS NOT NULL AND subscription.trial_ends_at > now()
          ELSE subscription.ends_at IS NOT NULL AND subscription.ends_at > now()
        END
    ) INTO has_current_license;
    IF NOT has_current_license THEN
      RAISE EXCEPTION 'Licence absente, suspendue ou expirée.';
    END IF;
    UPDATE public.tenants SET
      is_active = true, suspended_at = NULL, suspended_by = NULL, suspension_reason = NULL
    WHERE id = target.id;
  ELSE
    RAISE EXCEPTION 'Action de cycle de vie invalide.';
  END IF;

  INSERT INTO public.tenant_lifecycle_audit (
    super_admin_id, tenant_id, partner_id, action, reason, dependency_snapshot
  ) VALUES (
    requested_actor_id, target.id, creator_partner_id,
    CASE requested_action
      WHEN 'soft_delete' THEN 'soft_deleted'
      WHEN 'restore' THEN 'restored'
      WHEN 'suspend' THEN 'suspended'
      ELSE 'reactivated'
    END,
    btrim(requested_reason), dependencies
  );

  INSERT INTO public.audit_logs (user_id, action, module, entity_id, metadata)
  VALUES (
    requested_actor_id, 'tenant.' || requested_action, 'super_admin_tenants',
    target.id::text,
    jsonb_build_object(
      'super_admin_id', requested_actor_id, 'tenant_id', target.id,
      'partner_id', creator_partner_id, 'reason', btrim(requested_reason),
      'dependencies', dependencies
    )
  );

  RETURN jsonb_build_object(
    'tenant_id', target.id, 'partner_id', creator_partner_id,
    'action', requested_action, 'dependencies', dependencies
  );
END;
$$;

REVOKE ALL ON FUNCTION public.manage_tenant_lifecycle(uuid, uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.manage_tenant_lifecycle(uuid, uuid, text, text, text, text)
  TO authenticated, service_role;

-- Partners can request review, but cannot mutate tenant lifecycle state.
CREATE TABLE IF NOT EXISTS public.tenant_suspension_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE RESTRICT,
  requested_by uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

ALTER TABLE public.tenant_suspension_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_suspension_requests_partner_read
  ON public.tenant_suspension_requests FOR SELECT TO authenticated
  USING (partner_id = public.current_partner_id());
REVOKE INSERT, UPDATE, DELETE ON public.tenant_suspension_requests FROM authenticated;
GRANT SELECT ON public.tenant_suspension_requests TO authenticated;
GRANT ALL ON public.tenant_suspension_requests TO service_role;

CREATE OR REPLACE FUNCTION public.request_tenant_suspension(
  requested_tenant_id uuid,
  requested_actor_id uuid,
  requested_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_partner_id uuid;
  request_id uuid;
BEGIN
  IF requested_actor_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Acteur invalide.'; END IF;
  actor_partner_id := public.partner_id_for_actor(requested_actor_id);
  IF actor_partner_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.partner_tenants
    WHERE partner_id = actor_partner_id AND tenant_id = requested_tenant_id
  ) THEN RAISE EXCEPTION 'Accès refusé au tenant.'; END IF;
  IF length(btrim(coalesce(requested_reason, ''))) < 3 THEN RAISE EXCEPTION 'Motif obligatoire.'; END IF;

  INSERT INTO public.tenant_suspension_requests (tenant_id, partner_id, requested_by, reason)
  VALUES (requested_tenant_id, actor_partner_id, requested_actor_id, btrim(requested_reason))
  RETURNING id INTO request_id;
  INSERT INTO public.partner_activity_logs (partner_id, user_id, action, tenant_id, metadata)
  VALUES (actor_partner_id, requested_actor_id, 'tenant.suspension_requested',
          requested_tenant_id, jsonb_build_object('request_id', request_id, 'reason', btrim(requested_reason)));
  RETURN request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_tenant_suspension(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_tenant_suspension(uuid, uuid, text) TO authenticated;
