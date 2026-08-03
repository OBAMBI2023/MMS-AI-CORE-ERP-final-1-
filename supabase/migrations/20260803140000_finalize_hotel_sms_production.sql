-- Final production hardening for Premium SMS. Additive and safe to replay.
ALTER TABLE public.module_credit_ledger
  DROP CONSTRAINT IF EXISTS module_credit_ledger_entry_type_check;
ALTER TABLE public.module_credit_ledger
  ADD CONSTRAINT module_credit_ledger_entry_type_check CHECK
  (entry_type IN ('activation','renewal','recharge','adjustment','consumption','refund','suspension','reactivation','expiration'));

-- Remove superseded overloads so PostgREST always resolves the exact frontend contract.
DROP FUNCTION IF EXISTS public.prepare_hotel_sms(uuid,text,text,text);
DROP FUNCTION IF EXISTS public.complete_hotel_sms(uuid,text,text,text);

CREATE OR REPLACE FUNCTION public.complete_hotel_sms(
  target_log_id uuid,final_status text,external_id text,failure_message text,
  response_request_id text DEFAULT NULL,response_http_status integer DEFAULT NULL,
  response_error_code text DEFAULT NULL,response_error_message text DEFAULT NULL,
  response_payload jsonb DEFAULT NULL,response_estimated_cost numeric DEFAULT NULL,
  response_currency text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF final_status NOT IN ('sent','failed') THEN RAISE EXCEPTION 'Statut final SMS invalide'; END IF;
  UPDATE public.hotel_sms_logs SET status=final_status,provider_message_id=external_id,
    error_message=failure_message,request_id=response_request_id,http_status=response_http_status,
    provider_error_code=response_error_code,provider_error_message=response_error_message,
    provider_response=response_payload,estimated_cost=response_estimated_cost,currency=response_currency,
    sent_at=CASE WHEN final_status='sent' THEN now() ELSE NULL END
  WHERE id=target_log_id AND tenant_id=public.hotel_tenant_id()
    AND created_by=auth.uid() AND status='pending';
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Journal SMS inaccessible ou déjà finalisé'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.settle_hotel_sms_credit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sub public.tenant_module_subscriptions%ROWTYPE; mid uuid;
BEGIN
 IF OLD.status<>'pending' OR NEW.status NOT IN ('sent','failed') THEN RETURN NEW; END IF;
 SELECT id INTO mid FROM public.erp_modules WHERE code='hotel_sms';
 SELECT * INTO sub FROM public.tenant_module_subscriptions
 WHERE tenant_id=NEW.tenant_id AND module_id=mid FOR UPDATE;
 IF sub.id IS NULL OR sub.reserved_credits<1 THEN RAISE EXCEPTION 'Réservation de crédit SMS introuvable'; END IF;
 IF NEW.status='sent' THEN
   UPDATE public.tenant_module_subscriptions
   SET credit_balance=credit_balance-1,reserved_credits=reserved_credits-1,updated_at=now()
   WHERE id=sub.id RETURNING * INTO sub;
   INSERT INTO public.module_credit_ledger
     (tenant_id,module_id,subscription_id,entry_type,credits,balance_after,reason,reference,actor_id)
   VALUES(NEW.tenant_id,mid,sub.id,'consumption',-1,sub.credit_balance,
     'SMS confirmé par le fournisseur',NEW.id::text,NEW.created_by)
   ON CONFLICT DO NOTHING;
 ELSE
   UPDATE public.tenant_module_subscriptions
   SET reserved_credits=reserved_credits-1,updated_at=now() WHERE id=sub.id;
 END IF;
 RETURN NEW;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS module_credit_ledger_sms_consumption_uidx
  ON public.module_credit_ledger(reference) WHERE entry_type='consumption' AND reference IS NOT NULL;

CREATE OR REPLACE FUNCTION public.expire_due_module_subscriptions(p_module_code text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE changed integer:=0; item record;
BEGIN
 FOR item IN
   SELECT s.*,m.code FROM public.tenant_module_subscriptions s
   JOIN public.erp_modules m ON m.id=s.module_id
   WHERE s.status='active' AND s.expires_at IS NOT NULL AND s.expires_at<=now()
     AND (p_module_code IS NULL OR m.code=p_module_code)
   FOR UPDATE OF s
 LOOP
   UPDATE public.tenant_module_subscriptions SET status='expired',updated_at=now() WHERE id=item.id;
   UPDATE public.tenant_modules SET enabled=false WHERE tenant_id=item.tenant_id AND module_id=item.module_id;
   INSERT INTO public.module_credit_ledger
     (tenant_id,module_id,subscription_id,entry_type,credits,balance_after,reason,reference,actor_id)
   VALUES(item.tenant_id,item.module_id,item.id,'expiration',0,item.credit_balance,
     'Expiration automatique de l’abonnement',item.id::text,item.activated_by);
   changed:=changed+1;
 END LOOP;
 RETURN changed;
END $$;

CREATE OR REPLACE FUNCTION public.get_current_module_subscription(p_module_code text)
RETURNS TABLE(status text,credit_balance integer,expires_at timestamptz,plan_name text,enabled boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM public.expire_due_module_subscriptions(p_module_code);
 RETURN QUERY
 SELECT s.status,s.credit_balance,s.expires_at,p.name,
   (COALESCE(tm.enabled,false) AND s.status='active' AND
    (s.expires_at IS NULL OR s.expires_at>now()) AND s.credit_balance>0)
 FROM public.erp_modules m
 LEFT JOIN public.tenant_module_subscriptions s
   ON s.module_id=m.id AND s.tenant_id=public.hotel_tenant_id()
 LEFT JOIN public.module_plans p ON p.id=s.plan_id
 LEFT JOIN public.tenant_modules tm
   ON tm.module_id=m.id AND tm.tenant_id=public.hotel_tenant_id()
 WHERE m.code=p_module_code;
END $$;

REVOKE ALL ON FUNCTION public.complete_hotel_sms(uuid,text,text,text,text,integer,text,text,jsonb,numeric,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.complete_hotel_sms(uuid,text,text,text,text,integer,text,text,jsonb,numeric,text) TO authenticated;
REVOKE ALL ON FUNCTION public.expire_due_module_subscriptions(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.expire_due_module_subscriptions(text) TO service_role;
REVOKE ALL ON FUNCTION public.get_current_module_subscription(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_current_module_subscription(text) TO authenticated;

NOTIFY pgrst, 'reload schema';
