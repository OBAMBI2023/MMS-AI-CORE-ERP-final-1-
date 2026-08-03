-- SMS Clients is a Hotel premium module. It is assigned independently and
-- starts disabled for every tenant until a platform administrator enables it.
INSERT INTO public.erp_modules (code, name, description, icon, sort_order, is_active)
VALUES ('hotel_sms', 'SMS Clients', 'Communications SMS transactionnelles avec les clients (Premium)', 'MessageSquareText', 270, true)
ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, icon=EXCLUDED.icon, sort_order=EXCLUDED.sort_order, is_active=true;

INSERT INTO public.module_pack_items(pack_id,module_id)
SELECT pack.id,module.id FROM public.module_packs pack CROSS JOIN public.erp_modules module
WHERE pack.code='hotel' AND module.code='hotel_sms'
ON CONFLICT DO NOTHING;

INSERT INTO public.tenant_modules(tenant_id,module_id,enabled)
SELECT tenant.id,module.id,false FROM public.tenants tenant CROSS JOIN public.erp_modules module
WHERE tenant.platform_type='HOTEL' AND module.code='hotel_sms'
ON CONFLICT (tenant_id,module_id) DO NOTHING;

-- Pack changes must never silently activate or deactivate the premium option.
CREATE OR REPLACE FUNCTION public.assign_module_pack_to_tenant(requested_tenant_id uuid,requested_pack_id uuid,requested_by uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_platform_admin_actor(requested_by) THEN RAISE EXCEPTION 'Accès réservé aux Super Admins'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.tenants WHERE id=requested_tenant_id) THEN RAISE EXCEPTION 'Tenant introuvable'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.module_packs WHERE id=requested_pack_id AND is_active) THEN RAISE EXCEPTION 'Pack actif introuvable'; END IF;
  INSERT INTO public.tenant_module_packs(tenant_id,pack_id,assigned_at,assigned_by) VALUES(requested_tenant_id,requested_pack_id,now(),requested_by)
  ON CONFLICT(tenant_id) DO UPDATE SET pack_id=EXCLUDED.pack_id,assigned_at=now(),assigned_by=EXCLUDED.assigned_by;
  INSERT INTO public.tenant_modules(tenant_id,module_id,enabled)
  SELECT requested_tenant_id,module.id,EXISTS(SELECT 1 FROM public.module_pack_items item WHERE item.pack_id=requested_pack_id AND item.module_id=module.id)
  FROM public.erp_modules module WHERE module.code <> 'hotel_sms'
  ON CONFLICT(tenant_id,module_id) DO UPDATE SET enabled=EXCLUDED.enabled;
END $$;

-- All reads and sends are denied as soon as the premium assignment is inactive.
DROP POLICY IF EXISTS hotel_sms_logs_select ON public.hotel_sms_logs;
CREATE POLICY hotel_sms_logs_select ON public.hotel_sms_logs FOR SELECT TO authenticated
USING (tenant_id=public.hotel_tenant_id() AND public.hotel_module_enabled('hotel_sms') AND public.has_permission('hotel.sms.view'));

DROP POLICY IF EXISTS hotel_sms_settings_select ON public.hotel_sms_settings;
CREATE POLICY hotel_sms_settings_select ON public.hotel_sms_settings FOR SELECT TO authenticated
USING (tenant_id=public.hotel_tenant_id() AND public.hotel_module_enabled('hotel_sms') AND public.has_permission('hotel.sms.settings'));
DROP POLICY IF EXISTS hotel_sms_settings_write ON public.hotel_sms_settings;
CREATE POLICY hotel_sms_settings_write ON public.hotel_sms_settings FOR ALL TO authenticated
USING (tenant_id=public.hotel_tenant_id() AND public.hotel_module_enabled('hotel_sms') AND public.has_permission('hotel.sms.settings'))
WITH CHECK (tenant_id=public.hotel_tenant_id() AND public.hotel_module_enabled('hotel_sms') AND public.has_permission('hotel.sms.settings') AND updated_by=auth.uid());

CREATE OR REPLACE FUNCTION public.prepare_hotel_sms(target_reservation_id uuid,sms_type text,sms_message text,sms_provider text)
RETURNS TABLE(log_id uuid,phone text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE tid uuid:=public.hotel_tenant_id(); rid uuid; gid uuid; guest_phone text; new_id uuid;
BEGIN
  IF tid IS NULL OR NOT public.hotel_module_enabled('hotel_sms') OR NOT public.has_permission('hotel.sms.send') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Module Premium non activé'; END IF;
  IF sms_type NOT IN ('confirmation','arrival_reminder','departure_reminder','balance_reminder','cancellation','thanks') OR length(btrim(sms_message)) NOT BETWEEN 1 AND 918 THEN RAISE EXCEPTION 'Message SMS invalide'; END IF;
  SELECT r.id,r.guest_id,g.phone INTO rid,gid,guest_phone FROM public.hotel_reservations r JOIN public.hotel_guests g ON g.id=r.guest_id AND g.tenant_id=r.tenant_id WHERE r.id=target_reservation_id AND r.tenant_id=tid;
  IF rid IS NULL OR guest_phone IS NULL THEN RAISE EXCEPTION 'Réservation ou téléphone introuvable'; END IF;
  IF EXISTS(SELECT 1 FROM public.hotel_sms_logs WHERE tenant_id=tid AND reservation_id=rid AND created_by=auth.uid() AND created_at>now()-interval '30 seconds') THEN RAISE EXCEPTION 'Veuillez patienter avant un nouvel envoi'; END IF;
  IF (SELECT count(*) FROM public.hotel_sms_logs WHERE tenant_id=tid AND created_by=auth.uid() AND created_at>now()-interval '1 hour')>=30 OR (SELECT count(*) FROM public.hotel_sms_logs WHERE tenant_id=tid AND reservation_id=rid AND created_at>now()-interval '1 day')>=10 THEN RAISE EXCEPTION 'Limite d’envoi atteinte'; END IF;
  INSERT INTO public.hotel_sms_logs(tenant_id,reservation_id,guest_id,phone,message_type,message,provider,created_by) VALUES(tid,rid,gid,guest_phone,sms_type,btrim(sms_message),sms_provider,auth.uid()) RETURNING id INTO new_id;
  RETURN QUERY SELECT new_id,guest_phone;
END $$;

REVOKE ALL ON FUNCTION public.assign_module_pack_to_tenant(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.assign_module_pack_to_tenant(uuid,uuid,uuid) TO service_role;
NOTIFY pgrst, 'reload schema';
