-- Make every public-schema write for a Super Admin invitation one transaction.
-- Auth invitation creation remains a server-only operation performed immediately before this RPC.
CREATE OR REPLACE FUNCTION public.create_invited_tenant_atomic(
  requested_company_name text,
  requested_admin_name text,
  requested_admin_email text,
  requested_admin_user_id uuid,
  requested_actor_id uuid,
  requested_platform_type text,
  requested_billing_cycle public.subscription_billing_cycle,
  requested_duration_days integer,
  requested_module_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  created_tenant_id uuid;
  created_slug text;
  auth_email text;
  normalized_platform text := upper(btrim(requested_platform_type));
  requested_module_count integer;
  assigned_module_count integer;
  hotel_pack_id uuid;
BEGIN
  IF NOT public.is_platform_admin_actor(requested_actor_id) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Accès refusé';
  END IF;
  IF char_length(btrim(COALESCE(requested_company_name,''))) < 2 THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Le nom de l''entreprise est requis';
  END IF;
  IF char_length(btrim(COALESCE(requested_admin_name,''))) < 2 THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Le nom de l''administrateur est requis';
  END IF;
  IF normalized_platform NOT IN ('ERP','HOTEL') THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Plateforme invalide';
  END IF;
  IF requested_duration_days < 1 OR requested_duration_days > 3650 THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Durée invalide';
  END IF;

  SELECT users.email INTO auth_email FROM auth.users users WHERE users.id=requested_admin_user_id;
  IF auth_email IS NULL OR lower(auth_email)<>lower(btrim(requested_admin_email)) THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Le compte invité est invalide';
  END IF;

  INSERT INTO public.tenants(name,is_active,onboarding_status,platform_type)
  VALUES(btrim(requested_company_name),false,'pending_password',normalized_platform)
  RETURNING id,slug INTO created_tenant_id,created_slug;

  UPDATE public.profiles SET tenant_id=created_tenant_id,email=lower(btrim(requested_admin_email)),
    full_name=btrim(requested_admin_name),status='pending_password',role_id=NULL
  WHERE id=requested_admin_user_id AND tenant_id IS NULL AND role_id IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='Le profil administrateur n''a pas pu être rattaché';
  END IF;

  PERFORM public.initialize_tenant_roles(created_tenant_id,requested_admin_user_id);

  UPDATE public.subscriptions SET status='active',billing_cycle=requested_billing_cycle,
    starts_at=now(),ends_at=now()+make_interval(days=>requested_duration_days),
    trial_started_at=NULL,trial_ends_at=NULL
  WHERE tenant_id=created_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='L''abonnement n''a pas pu être créé';
  END IF;

  IF normalized_platform='HOTEL' THEN
    SELECT id INTO hotel_pack_id FROM public.module_packs WHERE code='hotel' AND is_active;
    IF hotel_pack_id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='Le pack Hôtel actif est introuvable';
    END IF;
    INSERT INTO public.tenant_module_packs(tenant_id,pack_id,assigned_by)
      VALUES(created_tenant_id,hotel_pack_id,requested_actor_id);
    INSERT INTO public.tenant_modules(tenant_id,module_id,enabled)
      SELECT created_tenant_id,item.module_id,true FROM public.module_pack_items item
      JOIN public.erp_modules module ON module.id=item.module_id AND module.is_active
      WHERE item.pack_id=hotel_pack_id;
    GET DIAGNOSTICS assigned_module_count=ROW_COUNT;
    IF assigned_module_count=0 THEN
      RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='Le pack Hôtel ne contient aucun module actif';
    END IF;
  ELSE
    SELECT count(DISTINCT id) INTO requested_module_count
      FROM unnest(COALESCE(requested_module_ids,ARRAY[]::uuid[])) AS ids(id);
    INSERT INTO public.tenant_modules(tenant_id,module_id,enabled)
      SELECT created_tenant_id,module.id,true FROM public.erp_modules module
      WHERE module.id=ANY(COALESCE(requested_module_ids,ARRAY[]::uuid[])) AND module.is_active;
    GET DIAGNOSTICS assigned_module_count=ROW_COUNT;
    IF assigned_module_count<>requested_module_count THEN
      RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='Un ou plusieurs modules ERP sont invalides ou inactifs';
    END IF;
  END IF;

  INSERT INTO public.audit_logs(user_id,action,module,entity_id,metadata) VALUES(
    requested_actor_id,'tenant.invitation_created','super_admin',created_tenant_id,
    jsonb_build_object('admin_email',lower(btrim(requested_admin_email)),
      'platform_type',normalized_platform,'duration_days',requested_duration_days,
      'onboarding_status','pending_password'));

  RETURN jsonb_build_object('tenantId',created_tenant_id,'slug',created_slug);
END;
$$;

REVOKE ALL ON FUNCTION public.create_invited_tenant_atomic(
  text,text,text,uuid,uuid,text,public.subscription_billing_cycle,integer,uuid[]
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_invited_tenant_atomic(
  text,text,text,uuid,uuid,text,public.subscription_billing_cycle,integer,uuid[]
) TO service_role;
