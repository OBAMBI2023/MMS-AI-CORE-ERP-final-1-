-- Additive, intentionally unapplied migration: public requests stay inert until approved.
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS onboarding_status text NOT NULL DEFAULT 'active';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS activity text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS suggested_pack_code text;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('active', 'pending', 'suspended', 'archived')) NOT VALID;
ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_status_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_onboarding_status_check
  CHECK (onboarding_status IN ('pending_configuration', 'active')) NOT VALID;

CREATE OR REPLACE FUNCTION public.create_pending_trial_request(
  p_user_id uuid, p_company_name text, p_full_name text, p_activity text, p_email text, p_phone text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_tenant_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(lower(btrim(p_company_name))));
  IF EXISTS (SELECT 1 FROM public.tenants WHERE lower(btrim(name))=lower(btrim(p_company_name)) AND deleted_at IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Cette entreprise existe déjà';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id AND lower(email) = lower(btrim(p_email))) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Compte utilisateur invalide';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(email) = lower(btrim(p_email)) AND id <> p_user_id) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Cette adresse e-mail est déjà utilisée';
  END IF;
  INSERT INTO public.tenants(name, is_active, onboarding_status, activity, suggested_pack_code)
  VALUES (btrim(p_company_name), false, 'pending_configuration', p_activity,
    CASE p_activity WHEN 'Restaurant' THEN 'restaurant' WHEN 'Hôtel / Résidence' THEN 'hotel'
      WHEN 'Imprimerie' THEN 'imprimerie' WHEN 'Services' THEN 'services' ELSE 'commerce' END)
  RETURNING id INTO v_tenant_id;
  UPDATE public.profiles SET tenant_id=v_tenant_id, full_name=btrim(p_full_name), email=lower(btrim(p_email)),
    phone=btrim(p_phone), status='pending', role_id=NULL WHERE id=p_user_id AND tenant_id IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='Profil pending impossible à créer'; END IF;
  DELETE FROM public.subscriptions WHERE tenant_id=v_tenant_id;
  DELETE FROM public.tenant_modules WHERE tenant_id=v_tenant_id;
  INSERT INTO public.audit_logs(user_id, entity_id, action, module, metadata)
  VALUES (p_user_id, v_tenant_id::text, 'Demande d’essai créée', 'Onboarding', jsonb_build_object('activity',p_activity));
  RETURN v_tenant_id;
END $$;
REVOKE ALL ON FUNCTION public.create_pending_trial_request(uuid,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_pending_trial_request(uuid,text,text,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.activate_pending_trial(
  p_tenant_id uuid, p_actor_id uuid, p_pack_id uuid, p_module_ids uuid[],
  p_billing_cycle text, p_duration_days integer, p_amount numeric DEFAULT 0
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin_id uuid; v_role_id uuid; v_now timestamptz := now();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id=p_actor_id) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF p_duration_days < 1 OR p_duration_days > 3650 THEN RAISE EXCEPTION 'Durée invalide'; END IF;
  SELECT id INTO v_admin_id FROM public.profiles WHERE tenant_id=p_tenant_id AND status='pending' ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF v_admin_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.tenants WHERE id=p_tenant_id AND onboarding_status='pending_configuration' FOR UPDATE) THEN
    RAISE EXCEPTION 'Demande pending introuvable';
  END IF;
  PERFORM public.initialize_tenant_roles(p_tenant_id, v_admin_id);
  SELECT id INTO v_role_id FROM public.roles WHERE tenant_id=p_tenant_id AND name='Administrateur';
  UPDATE public.profiles SET status='active', role_id=v_role_id WHERE id=v_admin_id;
  UPDATE public.tenants SET is_active=true, onboarding_status='active' WHERE id=p_tenant_id;
  DELETE FROM public.tenant_module_packs WHERE tenant_id=p_tenant_id;
  IF p_pack_id IS NOT NULL THEN INSERT INTO public.tenant_module_packs(tenant_id,pack_id) VALUES(p_tenant_id,p_pack_id); END IF;
  DELETE FROM public.tenant_modules WHERE tenant_id=p_tenant_id;
  INSERT INTO public.tenant_modules(tenant_id,module_id,enabled)
    SELECT p_tenant_id,id,true FROM public.erp_modules WHERE id=ANY(COALESCE(p_module_ids,ARRAY[]::uuid[])) AND is_active;
  INSERT INTO public.subscriptions(tenant_id,trial_started_at,trial_ends_at,amount,billing_cycle,status)
  VALUES(p_tenant_id,v_now,v_now+make_interval(days=>p_duration_days),p_amount,p_billing_cycle,'trial')
  ON CONFLICT(tenant_id) DO UPDATE SET trial_started_at=v_now,trial_ends_at=v_now+make_interval(days=>p_duration_days),
    starts_at=NULL,ends_at=NULL,amount=p_amount,billing_cycle=p_billing_cycle,status='trial';
  INSERT INTO public.audit_logs(user_id,entity_id,action,module,metadata) VALUES
    (p_actor_id,p_tenant_id::text,'Demande d’essai activée','Onboarding',jsonb_build_object('duration_days',p_duration_days,'modules',p_module_ids,'pack_id',p_pack_id));
END $$;
REVOKE ALL ON FUNCTION public.activate_pending_trial(uuid,uuid,uuid,uuid[],text,integer,numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_pending_trial(uuid,uuid,uuid,uuid[],text,integer,numeric) TO service_role;
