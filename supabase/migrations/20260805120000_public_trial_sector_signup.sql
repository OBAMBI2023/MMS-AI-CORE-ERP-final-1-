-- Public 7-day trial signup now collects a business sector instead of a raw
-- platform toggle. The sector is validated server-side, drives both the
-- platform_type (ERP vs HOTEL) and the default module pack, and is stored on
-- the tenant using the pre-existing business_sector column. Additive:
-- signature stays (uuid,text,text,text,text,text) so grants/privileges from
-- the original migration keep applying unchanged.
CREATE OR REPLACE FUNCTION public.create_public_trial_workspace(
  p_user_id uuid,p_company_name text,p_full_name text,p_email text,p_phone text,p_sector text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE
  v_tenant_id uuid; v_pack_id uuid; v_now timestamptz:=now();
  v_sector text:=btrim(coalesce(p_sector,''));
  v_platform text; v_pack_code text;
BEGIN
  CASE v_sector
    WHEN 'Commerce' THEN v_platform:='ERP'; v_pack_code:='commerce';
    WHEN 'Services' THEN v_platform:='ERP'; v_pack_code:='services';
    WHEN 'Restaurant' THEN v_platform:='ERP'; v_pack_code:='restaurant';
    WHEN 'Hôtel / Résidence / Hébergement' THEN v_platform:='HOTEL'; v_pack_code:='hotel';
    ELSE RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Secteur d''activité invalide';
  END CASE;

  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user_id AND lower(email)=lower(btrim(p_email))) THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Compte utilisateur invalide'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('trial-email:'||lower(btrim(p_email))));
  PERFORM pg_advisory_xact_lock(hashtext('trial-phone:'||regexp_replace(p_phone,'[^0-9+]','','g')));
  IF EXISTS(SELECT 1 FROM public.profiles WHERE id<>p_user_id AND lower(btrim(email))=lower(btrim(p_email))) THEN
    RAISE EXCEPTION USING ERRCODE='23505',MESSAGE='Un essai a déjà été utilisé avec cet e-mail'; END IF;
  IF EXISTS(SELECT 1 FROM public.profiles WHERE id<>p_user_id AND phone IS NOT NULL AND
    regexp_replace(phone,'[^0-9+]','','g')=regexp_replace(p_phone,'[^0-9+]','','g')) THEN
    RAISE EXCEPTION USING ERRCODE='23505',MESSAGE='Un essai a déjà été utilisé avec ce téléphone'; END IF;

  INSERT INTO public.tenants(name,is_active,onboarding_status,platform_type,suggested_pack_code,business_sector)
    VALUES(btrim(p_company_name),true,'active',v_platform,v_pack_code,v_sector)
    RETURNING id INTO v_tenant_id;

  UPDATE public.profiles SET tenant_id=v_tenant_id,full_name=btrim(p_full_name),email=lower(btrim(p_email)),
    phone=btrim(p_phone),status='active',role_id=NULL WHERE id=p_user_id AND tenant_id IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Profil administrateur impossible à créer'; END IF;
  PERFORM public.initialize_tenant_roles(v_tenant_id,p_user_id);

  SELECT id INTO v_pack_id FROM public.module_packs WHERE code=v_pack_code AND is_active LIMIT 1;
  IF v_pack_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Modules indisponibles pour ce secteur'; END IF;
  INSERT INTO public.tenant_module_packs(tenant_id,pack_id) VALUES(v_tenant_id,v_pack_id) ON CONFLICT DO NOTHING;
  INSERT INTO public.tenant_modules(tenant_id,module_id,enabled)
    SELECT v_tenant_id,module_id,true FROM public.module_pack_items WHERE pack_id=v_pack_id
    ON CONFLICT(tenant_id,module_id) DO UPDATE SET enabled=true;

  UPDATE public.subscriptions SET status='trial',trial_started_at=v_now,trial_ends_at=v_now+interval '7 days',
    starts_at=NULL,ends_at=NULL,amount=0 WHERE tenant_id=v_tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='XX000',MESSAGE='Abonnement d''essai introuvable'; END IF;

  INSERT INTO public.audit_logs(user_id,entity_id,action,module,metadata) VALUES
    (p_user_id,v_tenant_id::text,'tenant.public_trial_created','Onboarding',
     jsonb_build_object('platform_type',v_platform,'sector',v_sector,'trial_days',7));
  RETURN v_tenant_id;
END $$;
REVOKE ALL ON FUNCTION public.create_public_trial_workspace(uuid,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_trial_workspace(uuid,text,text,text,text,text) TO service_role;
