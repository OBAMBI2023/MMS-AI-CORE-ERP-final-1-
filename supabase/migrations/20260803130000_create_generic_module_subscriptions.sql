-- Generic premium-module plans, subscriptions and append-only credit ledger.
CREATE TABLE IF NOT EXISTS public.module_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), module_id uuid NOT NULL REFERENCES public.erp_modules(id) ON DELETE RESTRICT,
  name text NOT NULL, price numeric(14,2) NOT NULL CHECK(price>=0), duration_days integer NOT NULL CHECK(duration_days>0),
  included_credits integer NOT NULL CHECK(included_credits>=0), is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(module_id,name)
);
CREATE TABLE IF NOT EXISTS public.tenant_module_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  module_id uuid NOT NULL REFERENCES public.erp_modules(id) ON DELETE RESTRICT, plan_id uuid REFERENCES public.module_plans(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK(status IN ('active','suspended','expired','cancelled')), credit_balance integer NOT NULL DEFAULT 0 CHECK(credit_balance>=0),
  reserved_credits integer NOT NULL DEFAULT 0 CHECK(reserved_credits>=0 AND reserved_credits<=credit_balance),
  starts_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz, activated_by uuid NOT NULL REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,module_id)
);
CREATE TABLE IF NOT EXISTS public.module_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  module_id uuid NOT NULL REFERENCES public.erp_modules(id) ON DELETE RESTRICT,
  subscription_id uuid NOT NULL REFERENCES public.tenant_module_subscriptions(id) ON DELETE RESTRICT,
  entry_type text NOT NULL CHECK(entry_type IN ('activation','renewal','recharge','adjustment','consumption','refund','suspension','reactivation')),
  credits integer NOT NULL, balance_after integer NOT NULL CHECK(balance_after>=0), reason text NOT NULL,
  reference text, actor_id uuid NOT NULL REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS module_credit_ledger_tenant_module_created_idx ON public.module_credit_ledger(tenant_id,module_id,created_at DESC);
ALTER TABLE public.module_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_module_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_credit_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.module_plans,public.tenant_module_subscriptions,public.module_credit_ledger FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.module_plans,public.tenant_module_subscriptions,public.module_credit_ledger TO authenticated;
GRANT ALL ON public.module_plans,public.tenant_module_subscriptions,public.module_credit_ledger TO service_role;
CREATE POLICY module_plans_read_active ON public.module_plans FOR SELECT TO authenticated USING(is_active);
CREATE POLICY module_subscription_read_own ON public.tenant_module_subscriptions FOR SELECT TO authenticated USING(tenant_id=public.hotel_tenant_id());
CREATE POLICY module_credit_ledger_read_own ON public.module_credit_ledger FOR SELECT TO authenticated USING(tenant_id=public.hotel_tenant_id());

CREATE OR REPLACE FUNCTION public.enforce_premium_module_subscription() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.enabled AND EXISTS(SELECT 1 FROM public.erp_modules WHERE id=NEW.module_id AND code='hotel_sms') AND NOT EXISTS(
   SELECT 1 FROM public.tenant_module_subscriptions s WHERE s.tenant_id=NEW.tenant_id AND s.module_id=NEW.module_id
   AND s.status='active' AND (s.expires_at IS NULL OR s.expires_at>now())
 ) THEN RAISE EXCEPTION 'Un abonnement SMS actif doit être attribué avant l’activation du module'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS enforce_premium_module_subscription ON public.tenant_modules;
CREATE TRIGGER enforce_premium_module_subscription BEFORE INSERT OR UPDATE OF enabled ON public.tenant_modules FOR EACH ROW EXECUTE FUNCTION public.enforce_premium_module_subscription();

CREATE OR REPLACE FUNCTION public.reserve_hotel_sms_credit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sub public.tenant_module_subscriptions%ROWTYPE; mid uuid;
BEGIN
 SELECT id INTO mid FROM public.erp_modules WHERE code='hotel_sms';
 SELECT * INTO sub FROM public.tenant_module_subscriptions WHERE tenant_id=NEW.tenant_id AND module_id=mid FOR UPDATE;
 IF sub.id IS NULL THEN RAISE EXCEPTION 'Le service SMS SAOVIA nécessite un abonnement actif'; END IF;
 IF sub.status<>'active' THEN RAISE EXCEPTION 'L’abonnement SMS est suspendu ou inactif'; END IF;
 IF sub.expires_at IS NOT NULL AND sub.expires_at<=now() THEN
   UPDATE public.tenant_module_subscriptions SET status='expired',updated_at=now() WHERE id=sub.id;
   UPDATE public.tenant_modules SET enabled=false WHERE tenant_id=NEW.tenant_id AND module_id=mid;
   RAISE EXCEPTION 'L’abonnement SMS a expiré';
 END IF;
 IF sub.credit_balance-sub.reserved_credits<1 THEN RAISE EXCEPTION 'Quota SMS épuisé. Contactez le support pour recharger vos crédits'; END IF;
 UPDATE public.tenant_module_subscriptions SET reserved_credits=reserved_credits+1,updated_at=now() WHERE id=sub.id;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS reserve_hotel_sms_credit ON public.hotel_sms_logs;
CREATE TRIGGER reserve_hotel_sms_credit BEFORE INSERT ON public.hotel_sms_logs FOR EACH ROW EXECUTE FUNCTION public.reserve_hotel_sms_credit();

CREATE OR REPLACE FUNCTION public.settle_hotel_sms_credit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sub public.tenant_module_subscriptions%ROWTYPE; mid uuid;
BEGIN
 IF OLD.status<>'pending' OR EXISTS(SELECT 1 FROM public.module_credit_ledger WHERE entry_type='consumption' AND reference=NEW.id::text) THEN RETURN NEW; END IF;
 SELECT id INTO mid FROM public.erp_modules WHERE code='hotel_sms';
 SELECT * INTO sub FROM public.tenant_module_subscriptions WHERE tenant_id=NEW.tenant_id AND module_id=mid FOR UPDATE;
 IF sub.id IS NULL OR sub.reserved_credits<1 THEN RAISE EXCEPTION 'Réservation de crédit SMS introuvable'; END IF;
 IF NEW.status IN ('sent','pending') THEN
   UPDATE public.tenant_module_subscriptions SET credit_balance=credit_balance-1,reserved_credits=reserved_credits-1,updated_at=now() WHERE id=sub.id RETURNING * INTO sub;
   INSERT INTO public.module_credit_ledger(tenant_id,module_id,subscription_id,entry_type,credits,balance_after,reason,reference,actor_id)
   VALUES(NEW.tenant_id,mid,sub.id,'consumption',-1,sub.credit_balance,'SMS accepté par le fournisseur',NEW.id::text,NEW.created_by);
 ELSE
   UPDATE public.tenant_module_subscriptions SET reserved_credits=reserved_credits-1,updated_at=now() WHERE id=sub.id;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS settle_hotel_sms_credit ON public.hotel_sms_logs;
CREATE TRIGGER settle_hotel_sms_credit AFTER UPDATE OF status ON public.hotel_sms_logs FOR EACH ROW EXECUTE FUNCTION public.settle_hotel_sms_credit();

-- Every existing and future pack can advertise SMS; activation remains explicitly false per tenant.
INSERT INTO public.module_pack_items(pack_id,module_id)
SELECT p.id,m.id FROM public.module_packs p CROSS JOIN public.erp_modules m WHERE m.code='hotel_sms' ON CONFLICT DO NOTHING;
INSERT INTO public.tenant_modules(tenant_id,module_id,enabled)
SELECT t.id,m.id,false FROM public.tenants t CROSS JOIN public.erp_modules m WHERE m.code='hotel_sms' ON CONFLICT(tenant_id,module_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.manage_module_plan(p_id uuid,p_module_code text,p_name text,p_price numeric,p_duration_days integer,p_credits integer,p_active boolean,p_actor uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE mid uuid; result uuid;
BEGIN
 IF NOT public.is_platform_admin_actor(p_actor) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Accès réservé aux Super Admins'; END IF;
 SELECT id INTO mid FROM public.erp_modules WHERE code=p_module_code; IF mid IS NULL THEN RAISE EXCEPTION 'Module introuvable'; END IF;
 IF p_price<0 OR p_duration_days<1 OR p_credits<0 OR btrim(p_name)='' THEN RAISE EXCEPTION 'Forfait invalide'; END IF;
 INSERT INTO public.module_plans(id,module_id,name,price,duration_days,included_credits,is_active) VALUES(COALESCE(p_id,gen_random_uuid()),mid,btrim(p_name),p_price,p_duration_days,p_credits,p_active)
 ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,price=EXCLUDED.price,duration_days=EXCLUDED.duration_days,included_credits=EXCLUDED.included_credits,is_active=EXCLUDED.is_active,updated_at=now()
 RETURNING id INTO result; RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.manage_tenant_module_subscription(p_tenant uuid,p_module_code text,p_action text,p_plan uuid,p_credits integer,p_expires_at timestamptz,p_reason text,p_actor uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE mid uuid; sub public.tenant_module_subscriptions%ROWTYPE; delta integer:=COALESCE(p_credits,0); plan public.module_plans%ROWTYPE;
BEGIN
 IF NOT public.is_platform_admin_actor(p_actor) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Accès réservé aux Super Admins'; END IF;
 SELECT id INTO mid FROM public.erp_modules WHERE code=p_module_code; IF mid IS NULL THEN RAISE EXCEPTION 'Module introuvable'; END IF;
 SELECT * INTO sub FROM public.tenant_module_subscriptions WHERE tenant_id=p_tenant AND module_id=mid FOR UPDATE;
 IF p_action IN ('activate','renew') THEN
   SELECT * INTO plan FROM public.module_plans WHERE id=p_plan AND module_id=mid AND is_active; IF plan.id IS NULL THEN RAISE EXCEPTION 'Forfait actif introuvable'; END IF;
   delta:=plan.included_credits+GREATEST(delta,0);
   INSERT INTO public.tenant_module_subscriptions(tenant_id,module_id,plan_id,status,credit_balance,starts_at,expires_at,activated_by)
   VALUES(p_tenant,mid,plan.id,'active',delta,now(),COALESCE(p_expires_at,now()+make_interval(days=>plan.duration_days)),p_actor)
   ON CONFLICT(tenant_id,module_id) DO UPDATE SET plan_id=EXCLUDED.plan_id,status='active',credit_balance=tenant_module_subscriptions.credit_balance+delta,starts_at=now(),expires_at=EXCLUDED.expires_at,updated_at=now()
   RETURNING * INTO sub;
   INSERT INTO public.tenant_modules(tenant_id,module_id,enabled) VALUES(p_tenant,mid,true) ON CONFLICT(tenant_id,module_id) DO UPDATE SET enabled=true;
   INSERT INTO public.module_credit_ledger(tenant_id,module_id,subscription_id,entry_type,credits,balance_after,reason,actor_id) VALUES(p_tenant,mid,sub.id,CASE WHEN p_action='activate' THEN 'activation' ELSE 'renewal' END,delta,sub.credit_balance,COALESCE(NULLIF(btrim(p_reason),''),p_action),p_actor);
 ELSIF p_action IN ('recharge','adjust') THEN
   IF sub.id IS NULL OR sub.credit_balance+delta<0 OR delta=0 THEN RAISE EXCEPTION 'Ajustement de crédits invalide'; END IF;
   UPDATE public.tenant_module_subscriptions SET credit_balance=credit_balance+delta,updated_at=now() WHERE id=sub.id RETURNING * INTO sub;
   INSERT INTO public.module_credit_ledger(tenant_id,module_id,subscription_id,entry_type,credits,balance_after,reason,actor_id) VALUES(p_tenant,mid,sub.id,CASE WHEN p_action='recharge' THEN 'recharge' ELSE 'adjustment' END,delta,sub.credit_balance,COALESCE(NULLIF(btrim(p_reason),''),'Ajustement Super Admin'),p_actor);
 ELSIF p_action IN ('suspend','reactivate') THEN
   IF sub.id IS NULL THEN RAISE EXCEPTION 'Abonnement introuvable'; END IF;
   UPDATE public.tenant_module_subscriptions SET status=CASE WHEN p_action='suspend' THEN 'suspended' ELSE 'active' END,expires_at=COALESCE(p_expires_at,expires_at),updated_at=now() WHERE id=sub.id RETURNING * INTO sub;
   UPDATE public.tenant_modules SET enabled=(p_action='reactivate') WHERE tenant_id=p_tenant AND module_id=mid;
   INSERT INTO public.module_credit_ledger(tenant_id,module_id,subscription_id,entry_type,credits,balance_after,reason,actor_id) VALUES(p_tenant,mid,sub.id,CASE WHEN p_action='suspend' THEN 'suspension' ELSE 'reactivation' END,0,sub.credit_balance,COALESCE(NULLIF(btrim(p_reason),''),p_action),p_actor);
 ELSE RAISE EXCEPTION 'Action abonnement invalide'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_current_module_subscription(p_module_code text)
RETURNS TABLE(status text,credit_balance integer,expires_at timestamptz,plan_name text,enabled boolean) LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 SELECT s.status,s.credit_balance,s.expires_at,p.name,(tm.enabled AND s.status='active' AND (s.expires_at IS NULL OR s.expires_at>now()) AND s.credit_balance>0)
 FROM public.erp_modules m LEFT JOIN public.tenant_module_subscriptions s ON s.module_id=m.id AND s.tenant_id=public.hotel_tenant_id()
 LEFT JOIN public.module_plans p ON p.id=s.plan_id LEFT JOIN public.tenant_modules tm ON tm.module_id=m.id AND tm.tenant_id=public.hotel_tenant_id()
 WHERE m.code=p_module_code
$$;
REVOKE ALL ON FUNCTION public.manage_module_plan(uuid,text,text,numeric,integer,integer,boolean,uuid),public.manage_tenant_module_subscription(uuid,text,text,uuid,integer,timestamptz,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.manage_module_plan(uuid,text,text,numeric,integer,integer,boolean,uuid),public.manage_tenant_module_subscription(uuid,text,text,uuid,integer,timestamptz,text,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.get_current_module_subscription(text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.get_current_module_subscription(text) TO authenticated;
NOTIFY pgrst,'reload schema';
