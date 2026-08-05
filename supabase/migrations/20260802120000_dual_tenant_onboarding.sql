-- Separate trusted Super Admin invitations from immediate public 7-day trials.
-- Additive migration: existing tenant/profile rows keep their current state.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('active','pending','pending_password','suspended','archived')) NOT VALID;
ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_status_check;
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_onboarding_status_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_onboarding_status_check
  CHECK (onboarding_status IN ('pending_configuration','pending_password','active')) NOT VALID;
ALTER TABLE public.tenants VALIDATE CONSTRAINT tenants_onboarding_status_check;

CREATE INDEX IF NOT EXISTS profiles_normalized_phone_idx
  ON public.profiles (regexp_replace(phone,'[^0-9+]','','g')) WHERE phone IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_public_trial_workspace(
  p_user_id uuid,p_company_name text,p_full_name text,p_email text,p_phone text,p_platform_type text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE v_tenant_id uuid; v_pack_id uuid; v_now timestamptz:=now(); v_platform text:=upper(btrim(p_platform_type));
BEGIN
  IF v_platform NOT IN ('ERP','HOTEL') THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Plateforme invalide'; END IF;
  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user_id AND lower(email)=lower(btrim(p_email))) THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Compte utilisateur invalide'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('trial-email:'||lower(btrim(p_email))));
  PERFORM pg_advisory_xact_lock(hashtext('trial-phone:'||regexp_replace(p_phone,'[^0-9+]','','g')));
  IF EXISTS(SELECT 1 FROM public.profiles WHERE id<>p_user_id AND lower(btrim(email))=lower(btrim(p_email))) THEN
    RAISE EXCEPTION USING ERRCODE='23505',MESSAGE='Un essai a déjà été utilisé avec cet e-mail'; END IF;
  IF EXISTS(SELECT 1 FROM public.profiles WHERE id<>p_user_id AND phone IS NOT NULL AND
    regexp_replace(phone,'[^0-9+]','','g')=regexp_replace(p_phone,'[^0-9+]','','g')) THEN
    RAISE EXCEPTION USING ERRCODE='23505',MESSAGE='Un essai a déjà été utilisé avec ce téléphone'; END IF;
  INSERT INTO public.tenants(name,is_active,onboarding_status,platform_type,suggested_pack_code)
    VALUES(btrim(p_company_name),true,'active',v_platform,CASE WHEN v_platform='HOTEL' THEN 'hotel' ELSE 'commerce' END)
    RETURNING id INTO v_tenant_id;
  UPDATE public.profiles SET tenant_id=v_tenant_id,full_name=btrim(p_full_name),email=lower(btrim(p_email)),
    phone=btrim(p_phone),status='active',role_id=NULL WHERE id=p_user_id AND tenant_id IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Profil administrateur impossible à créer'; END IF;
  PERFORM public.initialize_tenant_roles(v_tenant_id,p_user_id);
  SELECT id INTO v_pack_id FROM public.module_packs WHERE code=CASE WHEN v_platform='HOTEL' THEN 'hotel' ELSE 'commerce' END AND is_active LIMIT 1;
  IF v_pack_id IS NOT NULL THEN
    INSERT INTO public.tenant_module_packs(tenant_id,pack_id) VALUES(v_tenant_id,v_pack_id) ON CONFLICT DO NOTHING;
    INSERT INTO public.tenant_modules(tenant_id,module_id,enabled)
      SELECT v_tenant_id,module_id,true FROM public.module_pack_items WHERE pack_id=v_pack_id
      ON CONFLICT(tenant_id,module_id) DO UPDATE SET enabled=true;
  END IF;
  UPDATE public.subscriptions SET status='trial',trial_started_at=v_now,trial_ends_at=v_now+interval '7 days',
    starts_at=NULL,ends_at=NULL,amount=0 WHERE tenant_id=v_tenant_id;
  INSERT INTO public.audit_logs(user_id,entity_id,action,module,metadata) VALUES
    (p_user_id,v_tenant_id::text,'tenant.public_trial_created','Onboarding',jsonb_build_object('platform_type',v_platform,'trial_days',7));
  RETURN v_tenant_id;
END $$;
REVOKE ALL ON FUNCTION public.create_public_trial_workspace(uuid,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_trial_workspace(uuid,text,text,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.activate_invited_tenant_after_password()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_profile public.profiles%ROWTYPE; v_platform text; v_activated boolean:=false;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id=auth.uid() FOR UPDATE;
  IF v_profile.id IS NULL THEN RAISE EXCEPTION 'Profil introuvable'; END IF;
  IF v_profile.status='pending_password' THEN
    v_activated:=true;
    UPDATE public.profiles SET status='active' WHERE id=auth.uid();
    UPDATE public.tenants SET is_active=true,onboarding_status='active' WHERE id=v_profile.tenant_id AND onboarding_status='pending_password';
    INSERT INTO public.audit_logs(user_id,entity_id,action,module,metadata) VALUES
      (auth.uid(),v_profile.tenant_id::text,'tenant.password_created','Onboarding','{}'::jsonb);
  END IF;
  SELECT platform_type INTO v_platform FROM public.tenants WHERE id=v_profile.tenant_id;
  RETURN jsonb_build_object('activated',v_activated,'platformType',COALESCE(v_platform,'ERP'));
END $$;
REVOKE ALL ON FUNCTION public.activate_invited_tenant_after_password() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.activate_invited_tenant_after_password() TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_invited_tenant_pending_password(p_tenant_id uuid,p_user_id uuid,p_full_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.tenants SET is_active=false,onboarding_status='pending_password' WHERE id=p_tenant_id;
  UPDATE public.profiles SET status='pending_password',full_name=btrim(p_full_name) WHERE id=p_user_id AND tenant_id=p_tenant_id;
END $$;
REVOKE ALL ON FUNCTION public.mark_invited_tenant_pending_password(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mark_invited_tenant_pending_password(uuid,uuid,text) TO service_role;
