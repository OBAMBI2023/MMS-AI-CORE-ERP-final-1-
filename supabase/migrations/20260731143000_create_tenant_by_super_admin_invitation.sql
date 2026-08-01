-- Additive-only onboarding for tenants created by a platform administrator.
-- The Auth invitation is created by the trusted server before this transaction.
CREATE OR REPLACE FUNCTION public.create_tenant_by_super_admin_invitation(
  requested_company_name text,
  requested_admin_email text,
  requested_admin_user_id uuid,
  requested_actor_id uuid,
  requested_billing_cycle public.subscription_billing_cycle,
  requested_duration_days integer,
  requested_module_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  created_tenant_id uuid;
  auth_email text;
BEGIN
  IF NOT public.is_platform_admin_actor(requested_actor_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Accès refusé';
  END IF;
  IF btrim(COALESCE(requested_company_name, '')) = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Le nom de l''entreprise est requis';
  END IF;
  IF requested_duration_days < 1 OR requested_duration_days > 3650 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'La durée doit être comprise entre 1 et 3650 jours';
  END IF;

  SELECT email INTO auth_email FROM auth.users WHERE id = requested_admin_user_id;
  IF auth_email IS NULL OR lower(auth_email) <> lower(btrim(requested_admin_email)) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Le compte invité est invalide';
  END IF;

  INSERT INTO public.tenants (name)
  VALUES (btrim(requested_company_name))
  RETURNING id INTO created_tenant_id;

  UPDATE public.profiles
  SET tenant_id = created_tenant_id,
      email = lower(btrim(requested_admin_email)),
      full_name = COALESCE(NULLIF(btrim(full_name), ''), split_part(btrim(requested_admin_email), '@', 1)),
      status = 'actif'
  WHERE id = requested_admin_user_id AND tenant_id IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Le profil administrateur n''a pas pu être rattaché';
  END IF;

  PERFORM public.initialize_tenant_roles(created_tenant_id, requested_admin_user_id);

  UPDATE public.subscriptions
  SET status = 'active',
      billing_cycle = requested_billing_cycle,
      starts_at = now(),
      ends_at = now() + make_interval(days => requested_duration_days),
      trial_started_at = NULL,
      trial_ends_at = NULL
  WHERE tenant_id = created_tenant_id;

  INSERT INTO public.tenant_modules (tenant_id, module_id, enabled)
  SELECT created_tenant_id, module_id, true
  FROM public.erp_modules
  WHERE module_id = ANY(COALESCE(requested_module_ids, ARRAY[]::uuid[]))
    AND is_active
  ON CONFLICT (tenant_id, module_id) DO UPDATE SET enabled = EXCLUDED.enabled;

  INSERT INTO public.audit_logs (user_id, action, module, entity_id, metadata)
  VALUES (
    requested_actor_id,
    'tenant.invitation_created',
    'super_admin',
    created_tenant_id,
    jsonb_build_object('admin_email', lower(btrim(requested_admin_email)), 'duration_days', requested_duration_days)
  );

  RETURN created_tenant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_tenant_by_super_admin_invitation(text, text, uuid, uuid, public.subscription_billing_cycle, integer, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_tenant_by_super_admin_invitation(text, text, uuid, uuid, public.subscription_billing_cycle, integer, uuid[]) TO service_role;
