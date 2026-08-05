-- Additive SMS observability and tenant configuration. Existing rows are untouched.
ALTER TABLE public.hotel_sms_logs
  ADD COLUMN IF NOT EXISTS request_id text,
  ADD COLUMN IF NOT EXISTS http_status integer,
  ADD COLUMN IF NOT EXISTS provider_error_code text,
  ADD COLUMN IF NOT EXISTS provider_error_message text,
  ADD COLUMN IF NOT EXISTS provider_response jsonb,
  ADD COLUMN IF NOT EXISTS estimated_cost numeric(12,4),
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS retry_of uuid REFERENCES public.hotel_sms_logs(id) ON DELETE RESTRICT;

ALTER TABLE public.hotel_sms_logs DROP CONSTRAINT IF EXISTS hotel_sms_logs_message_type_check;
ALTER TABLE public.hotel_sms_logs ADD CONSTRAINT hotel_sms_logs_message_type_check CHECK
  (message_type IN ('confirmation','check_in','check_out','arrival_reminder','payment_received','balance_reminder','cancellation','custom','thanks'));

ALTER TABLE public.hotel_sms_settings
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'orange'
    CHECK (provider IN ('orange','twilio','infobip')),
  ADD COLUMN IF NOT EXISTS sender_name text,
  ADD COLUMN IF NOT EXISTS templates jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS confirmation_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_received_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancellation_enabled boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS hotel_sms_logs_tenant_created_idx
  ON public.hotel_sms_logs(tenant_id,created_at DESC);
CREATE INDEX IF NOT EXISTS hotel_sms_logs_tenant_status_type_idx
  ON public.hotel_sms_logs(tenant_id,status,message_type,created_at DESC);

-- Status/provider metadata may change, but the original message and ownership stay immutable.
CREATE OR REPLACE FUNCTION public.prevent_hotel_sms_log_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'L’historique SMS ne peut pas être supprimé'; END IF;
  IF OLD.tenant_id<>NEW.tenant_id OR OLD.reservation_id<>NEW.reservation_id OR
     OLD.guest_id<>NEW.guest_id OR OLD.phone<>NEW.phone OR OLD.message_type<>NEW.message_type OR
     OLD.message<>NEW.message OR OLD.provider<>NEW.provider OR OLD.created_by<>NEW.created_by OR
     OLD.created_at<>NEW.created_at OR OLD.retry_of IS DISTINCT FROM NEW.retry_of
  THEN RAISE EXCEPTION 'Le contenu de l’historique SMS est immuable'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.prepare_hotel_sms(
  target_reservation_id uuid,sms_type text,sms_message text,sms_provider text,
  retried_log_id uuid DEFAULT NULL
) RETURNS TABLE(log_id uuid,phone text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE tid uuid:=public.hotel_tenant_id(); rid uuid; gid uuid; guest_phone text; new_id uuid;
BEGIN
  IF tid IS NULL OR NOT public.hotel_module_enabled('hotel_sms') OR NOT public.has_permission('hotel.sms.send')
  THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Permission d’envoi SMS requise'; END IF;
  IF sms_type NOT IN ('confirmation','check_in','check_out','arrival_reminder','payment_received','balance_reminder','cancellation','custom','thanks')
     OR length(btrim(sms_message)) NOT BETWEEN 1 AND 918 THEN RAISE EXCEPTION 'Message SMS invalide'; END IF;
  IF sms_provider NOT IN ('orange','twilio','infobip') THEN RAISE EXCEPTION 'Fournisseur SMS invalide'; END IF;
  SELECT r.id,r.guest_id,g.phone INTO rid,gid,guest_phone
  FROM public.hotel_reservations r JOIN public.hotel_guests g ON g.id=r.guest_id AND g.tenant_id=r.tenant_id
  WHERE r.id=target_reservation_id AND r.tenant_id=tid;
  IF rid IS NULL OR guest_phone IS NULL THEN RAISE EXCEPTION 'Réservation ou téléphone introuvable'; END IF;
  IF retried_log_id IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM public.hotel_sms_logs l WHERE l.id=retried_log_id AND l.tenant_id=tid
      AND l.reservation_id=rid AND l.status='failed'
  ) THEN RAISE EXCEPTION 'Seul un SMS en échec peut être renvoyé'; END IF;
  IF retried_log_id IS NULL AND EXISTS(SELECT 1 FROM public.hotel_sms_logs WHERE tenant_id=tid AND reservation_id=rid AND created_by=auth.uid() AND created_at>now()-interval '30 seconds')
  THEN RAISE EXCEPTION 'Veuillez patienter avant un nouvel envoi'; END IF;
  INSERT INTO public.hotel_sms_logs(tenant_id,reservation_id,guest_id,phone,message_type,message,provider,created_by,retry_of)
  VALUES(tid,rid,gid,guest_phone,sms_type,btrim(sms_message),sms_provider,auth.uid(),retried_log_id)
  RETURNING id INTO new_id;
  RETURN QUERY SELECT new_id,guest_phone;
END $$;

CREATE OR REPLACE FUNCTION public.complete_hotel_sms(
  target_log_id uuid,final_status text,external_id text,failure_message text,
  response_request_id text DEFAULT NULL,response_http_status integer DEFAULT NULL,
  response_error_code text DEFAULT NULL,response_error_message text DEFAULT NULL,
  response_payload jsonb DEFAULT NULL,response_estimated_cost numeric DEFAULT NULL,
  response_currency text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF final_status NOT IN ('sent','pending','failed') THEN RAISE EXCEPTION 'Statut SMS invalide'; END IF;
  UPDATE public.hotel_sms_logs SET status=final_status,provider_message_id=external_id,
    error_message=failure_message,request_id=response_request_id,http_status=response_http_status,
    provider_error_code=response_error_code,provider_error_message=response_error_message,
    provider_response=response_payload,estimated_cost=response_estimated_cost,currency=response_currency,
    sent_at=CASE WHEN final_status='sent' THEN now() ELSE NULL END
  WHERE id=target_log_id AND tenant_id=public.hotel_tenant_id() AND created_by=auth.uid() AND status='pending';
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Journal SMS inaccessible'; END IF;
END $$;

REVOKE ALL ON FUNCTION public.prepare_hotel_sms(uuid,text,text,text,uuid),
  public.complete_hotel_sms(uuid,text,text,text,text,integer,text,text,jsonb,numeric,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prepare_hotel_sms(uuid,text,text,text),
  public.complete_hotel_sms(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_hotel_sms(uuid,text,text,text,uuid),
  public.complete_hotel_sms(uuid,text,text,text,text,integer,text,text,jsonb,numeric,text) TO authenticated;
NOTIFY pgrst, 'reload schema';
