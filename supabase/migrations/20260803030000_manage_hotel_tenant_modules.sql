-- Atomically manage Hotel module assignments from the Super Admin portal.
-- Disabling an assignment never removes module-owned business data.
CREATE OR REPLACE FUNCTION public.manage_hotel_tenant_module(
  requested_tenant_id uuid,
  requested_module_id uuid,
  requested_enabled boolean,
  requested_actor_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  previous_enabled boolean;
  module_code text;
BEGIN
  IF auth.uid() IS NULL OR requested_actor_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.platform_admins administrator
    WHERE administrator.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Accès réservé aux Super Admins';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tenants tenant
    WHERE tenant.id = requested_tenant_id AND tenant.platform_type = 'HOTEL'
  ) THEN
    RAISE EXCEPTION 'Tenant Hôtel introuvable';
  END IF;

  SELECT module.code INTO module_code
  FROM public.erp_modules module
  JOIN public.module_pack_items item ON item.module_id = module.id
  JOIN public.module_packs pack ON pack.id = item.pack_id
  WHERE module.id = requested_module_id
    AND module.is_active
    AND pack.code = 'hotel'
    AND pack.is_active;

  IF module_code IS NULL THEN
    RAISE EXCEPTION 'Module Hôtel indisponible';
  END IF;

  SELECT assignment.enabled INTO previous_enabled
  FROM public.tenant_modules assignment
  WHERE assignment.tenant_id = requested_tenant_id
    AND assignment.module_id = requested_module_id;

  INSERT INTO public.tenant_modules (tenant_id, module_id, enabled)
  VALUES (requested_tenant_id, requested_module_id, requested_enabled)
  ON CONFLICT (tenant_id, module_id)
  DO UPDATE SET enabled = EXCLUDED.enabled;

  INSERT INTO public.audit_logs (user_id, action, module, entity_id, metadata)
  VALUES (
    auth.uid(),
    CASE WHEN requested_enabled THEN 'tenant_module_enabled' ELSE 'tenant_module_disabled' END,
    'hotel_modules',
    requested_tenant_id::text,
    jsonb_build_object(
      'module_id', requested_module_id,
      'module_code', module_code,
      'previous_enabled', previous_enabled,
      'enabled', requested_enabled
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.manage_hotel_tenant_module(uuid, uuid, boolean, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_hotel_tenant_module(uuid, uuid, boolean, uuid)
  TO authenticated, service_role;

-- Make the new RPC signature immediately visible through PostgREST.
NOTIFY pgrst, 'reload schema';
