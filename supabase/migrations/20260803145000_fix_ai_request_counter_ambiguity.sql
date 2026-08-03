-- Qualify the counter column to keep the existing AI RPC valid under PL/pgSQL checks.
CREATE OR REPLACE FUNCTION public.reserve_ai_request_active_tenant_core(p_tenant_id uuid,p_user_id uuid,p_request_type text)
RETURNS TABLE(allowed boolean,reason text,usage_log_id uuid,plan_code text,monthly_request_limit integer,requests_used integer,current_period_start timestamptz,current_period_end timestamptz,subscription_status text,expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE subscription public.tenant_ai_subscriptions%ROWTYPE; log_id uuid; denial_reason text;
 denial_status text:='denied'; module_allowed boolean; permission_allowed boolean;
BEGIN
 SELECT EXISTS(SELECT 1 FROM public.tenant_modules tm JOIN public.erp_modules m ON m.id=tm.module_id
   WHERE tm.tenant_id=p_tenant_id AND tm.enabled AND m.code='ai_assistant' AND m.is_active) INTO module_allowed;
 SELECT EXISTS(SELECT 1 FROM public.profiles profile JOIN public.role_permissions rp ON rp.role_id=profile.role_id
   JOIN public.permissions permission ON permission.id=rp.permission_id WHERE profile.id=p_user_id
   AND profile.tenant_id=p_tenant_id AND permission.code='assistant.use') INTO permission_allowed;
 IF NOT module_allowed THEN denial_reason:='Le module Assistant IA n’est pas activé pour ce tenant.';
 ELSIF NOT permission_allowed THEN denial_reason:='Permission assistant.use requise.'; END IF;
 IF denial_reason IS NULL THEN
  SELECT * INTO subscription FROM public.tenant_ai_subscriptions s WHERE s.tenant_id=p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN denial_reason:='Aucun abonnement Assistant IA n’est configuré pour ce tenant.';
  ELSIF subscription.status NOT IN ('active','trial') THEN denial_reason:='L’abonnement Assistant IA n’est pas actif.';
  ELSIF subscription.expires_at IS NOT NULL AND subscription.expires_at<=now() THEN
   UPDATE public.tenant_ai_subscriptions SET status='expired' WHERE id=subscription.id;
   subscription.status:='expired'; denial_reason:='L’abonnement Assistant IA a expiré.';
  ELSE
   IF subscription.current_period_end<=now() THEN
    subscription.current_period_start:=now(); subscription.current_period_end:=now()+interval '1 month'; subscription.requests_used:=0;
    UPDATE public.tenant_ai_subscriptions SET current_period_start=subscription.current_period_start,
      current_period_end=subscription.current_period_end,requests_used=0 WHERE id=subscription.id;
   END IF;
   IF subscription.requests_used>=subscription.monthly_request_limit THEN denial_reason:='Quota mensuel Assistant IA épuisé.'; denial_status:='quota_exhausted';
   ELSE UPDATE public.tenant_ai_subscriptions AS target SET requests_used=target.requests_used+1
     WHERE target.id=subscription.id RETURNING target.* INTO subscription; END IF;
  END IF;
 END IF;
 INSERT INTO public.ai_usage_logs(tenant_id,user_id,request_type,status,error_message)
 VALUES(p_tenant_id,p_user_id,p_request_type,CASE WHEN denial_reason IS NULL THEN 'reserved' ELSE denial_status END,denial_reason)
 RETURNING id INTO log_id;
 RETURN QUERY SELECT denial_reason IS NULL,denial_reason,log_id,subscription.plan_code,subscription.monthly_request_limit,
  CASE WHEN subscription.current_period_end<=now() THEN 0 ELSE subscription.requests_used END,
  CASE WHEN subscription.current_period_end<=now() THEN now() ELSE subscription.current_period_start END,
  CASE WHEN subscription.current_period_end<=now() THEN now()+interval '1 month' ELSE subscription.current_period_end END,
  subscription.status,subscription.expires_at;
END $$;
REVOKE ALL ON FUNCTION public.reserve_ai_request_active_tenant_core(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_request_active_tenant_core(uuid,uuid,text) TO service_role;
NOTIFY pgrst, 'reload schema';
