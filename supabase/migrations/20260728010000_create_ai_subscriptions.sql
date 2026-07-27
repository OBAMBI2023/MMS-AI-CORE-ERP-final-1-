-- Assistant IA billing is independent from the ERP subscription.
-- No tenant receives an AI subscription automatically.
CREATE TABLE IF NOT EXISTS public.ai_plans (
  code text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  monthly_request_limit integer CHECK (
    monthly_request_limit IS NULL OR monthly_request_limit > 0
  ),
  price numeric(14,2) CHECK (price IS NULL OR price >= 0),
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ai_plans (code, name, monthly_request_limit, price, enabled)
VALUES
  ('starter', 'Starter', NULL, NULL, false),
  ('pro', 'Pro', NULL, NULL, false),
  ('enterprise', 'Enterprise', NULL, NULL, false)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

CREATE TABLE IF NOT EXISTS public.tenant_ai_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_code text NOT NULL REFERENCES public.ai_plans(code),
  status text NOT NULL CHECK (
    status IN ('trial', 'active', 'expired', 'suspended', 'cancelled')
  ),
  monthly_request_limit integer NOT NULL CHECK (monthly_request_limit > 0),
  requests_used integer NOT NULL DEFAULT 0 CHECK (requests_used >= 0),
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  activated_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_ai_subscription_period_valid CHECK (
    current_period_end > current_period_start
  )
);

CREATE INDEX IF NOT EXISTS tenant_ai_subscriptions_status_idx
  ON public.tenant_ai_subscriptions (status, expires_at);

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name text,
  request_type text NOT NULL,
  input_tokens integer CHECK (input_tokens IS NULL OR input_tokens >= 0),
  output_tokens integer CHECK (output_tokens IS NULL OR output_tokens >= 0),
  total_tokens integer CHECK (total_tokens IS NULL OR total_tokens >= 0),
  estimated_cost numeric(18,8) CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
  status text NOT NULL CHECK (
    status IN ('reserved', 'success', 'error', 'quota_exhausted', 'denied')
  ),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_logs_tenant_created_idx
  ON public.ai_usage_logs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_logs_user_created_idx
  ON public.ai_usage_logs (user_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_ai_plans_updated_at ON public.ai_plans;
CREATE TRIGGER trg_ai_plans_updated_at
  BEFORE UPDATE ON public.ai_plans
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS trg_tenant_ai_subscriptions_updated_at
  ON public.tenant_ai_subscriptions;
CREATE TRIGGER trg_tenant_ai_subscriptions_updated_at
  BEFORE UPDATE ON public.tenant_ai_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS trg_ai_usage_logs_updated_at ON public.ai_usage_logs;
CREATE TRIGGER trg_ai_usage_logs_updated_at
  BEFORE UPDATE ON public.ai_usage_logs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.ai_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_ai_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ai_plans FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.tenant_ai_subscriptions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.ai_usage_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.ai_plans TO authenticated;
GRANT SELECT ON TABLE public.tenant_ai_subscriptions TO authenticated;
GRANT SELECT ON TABLE public.ai_usage_logs TO authenticated;
GRANT ALL ON TABLE public.ai_plans TO service_role;
GRANT ALL ON TABLE public.tenant_ai_subscriptions TO service_role;
GRANT ALL ON TABLE public.ai_usage_logs TO service_role;

DROP POLICY IF EXISTS "ai_plans_read_enabled" ON public.ai_plans;
CREATE POLICY "ai_plans_read_enabled"
  ON public.ai_plans FOR SELECT TO authenticated
  USING (enabled);

DROP POLICY IF EXISTS "tenant_ai_subscriptions_read_own"
  ON public.tenant_ai_subscriptions;
CREATE POLICY "tenant_ai_subscriptions_read_own"
  ON public.tenant_ai_subscriptions FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "ai_usage_logs_read_own_tenant" ON public.ai_usage_logs;
CREATE POLICY "ai_usage_logs_read_own_tenant"
  ON public.ai_usage_logs FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

-- Reserves exactly one request while holding the tenant subscription row lock.
-- It returns a denial instead of raising so denied attempts remain journalled.
CREATE OR REPLACE FUNCTION public.reserve_ai_request(
  p_tenant_id uuid,
  p_user_id uuid,
  p_request_type text
)
RETURNS TABLE (
  allowed boolean,
  reason text,
  usage_log_id uuid,
  plan_code text,
  monthly_request_limit integer,
  requests_used integer,
  current_period_start timestamptz,
  current_period_end timestamptz,
  subscription_status text,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subscription public.tenant_ai_subscriptions%ROWTYPE;
  log_id uuid;
  denial_reason text;
  denial_status text := 'denied';
  module_allowed boolean;
  permission_allowed boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_modules tm
    JOIN public.erp_modules m ON m.id = tm.module_id
    WHERE tm.tenant_id = p_tenant_id
      AND tm.enabled
      AND m.code = 'ai_assistant'
      AND m.is_active
  ) INTO module_allowed;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles profile
    JOIN public.role_permissions rp ON rp.role_id = profile.role_id
    JOIN public.permissions permission ON permission.id = rp.permission_id
    WHERE profile.id = p_user_id
      AND profile.tenant_id = p_tenant_id
      AND permission.code = 'assistant.use'
  ) INTO permission_allowed;

  IF NOT module_allowed THEN
    denial_reason := 'Le module Assistant IA n’est pas activé pour ce tenant.';
  ELSIF NOT permission_allowed THEN
    denial_reason := 'Permission assistant.use requise.';
  END IF;

  IF denial_reason IS NULL THEN
    SELECT *
    INTO subscription
    FROM public.tenant_ai_subscriptions s
    WHERE s.tenant_id = p_tenant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      denial_reason := 'Aucun abonnement Assistant IA n’est configuré pour ce tenant.';
    ELSIF subscription.status NOT IN ('active', 'trial') THEN
      denial_reason := 'L’abonnement Assistant IA n’est pas actif.';
    ELSIF subscription.expires_at IS NOT NULL
      AND subscription.expires_at <= now() THEN
      UPDATE public.tenant_ai_subscriptions
      SET status = 'expired'
      WHERE id = subscription.id;
      subscription.status := 'expired';
      denial_reason := 'L’abonnement Assistant IA a expiré.';
    ELSE
      IF subscription.current_period_end <= now() THEN
        subscription.current_period_start := now();
        subscription.current_period_end := now() + interval '1 month';
        subscription.requests_used := 0;
        UPDATE public.tenant_ai_subscriptions
        SET current_period_start = subscription.current_period_start,
            current_period_end = subscription.current_period_end,
            requests_used = 0
        WHERE id = subscription.id;
      END IF;

      IF subscription.requests_used >= subscription.monthly_request_limit THEN
        denial_reason := 'Quota mensuel Assistant IA épuisé.';
        denial_status := 'quota_exhausted';
      ELSE
        UPDATE public.tenant_ai_subscriptions
        SET requests_used = requests_used + 1
        WHERE id = subscription.id
        RETURNING * INTO subscription;
      END IF;
    END IF;
  END IF;

  INSERT INTO public.ai_usage_logs (
    tenant_id, user_id, request_type, status, error_message
  )
  VALUES (
    p_tenant_id,
    p_user_id,
    p_request_type,
    CASE WHEN denial_reason IS NULL THEN 'reserved' ELSE denial_status END,
    denial_reason
  )
  RETURNING id INTO log_id;

  RETURN QUERY SELECT
    denial_reason IS NULL,
    denial_reason,
    log_id,
    subscription.plan_code,
    subscription.monthly_request_limit,
    CASE
      WHEN subscription.current_period_end <= now() THEN 0
      ELSE subscription.requests_used
    END,
    CASE
      WHEN subscription.current_period_end <= now() THEN now()
      ELSE subscription.current_period_start
    END,
    CASE
      WHEN subscription.current_period_end <= now() THEN now() + interval '1 month'
      ELSE subscription.current_period_end
    END,
    subscription.status,
    subscription.expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_ai_request(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_request(uuid, uuid, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.get_ai_subscription_state(
  p_tenant_id uuid,
  p_user_id uuid
)
RETURNS TABLE (
  module_enabled boolean,
  permission_granted boolean,
  plan_code text,
  plan_name text,
  status text,
  monthly_request_limit integer,
  requests_used integer,
  current_period_start timestamptz,
  current_period_end timestamptz,
  expires_at timestamptz,
  valid boolean,
  quota_exhausted boolean
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.tenant_modules tm
      JOIN public.erp_modules m ON m.id = tm.module_id
      WHERE tm.tenant_id = p_tenant_id AND tm.enabled
        AND m.code = 'ai_assistant' AND m.is_active
    ),
    EXISTS (
      SELECT 1 FROM public.profiles profile
      JOIN public.role_permissions rp ON rp.role_id = profile.role_id
      JOIN public.permissions permission ON permission.id = rp.permission_id
      WHERE profile.id = p_user_id AND profile.tenant_id = p_tenant_id
        AND permission.code = 'assistant.use'
    ),
    subscription.plan_code,
    plan.name,
    subscription.status,
    subscription.monthly_request_limit,
    subscription.requests_used,
    subscription.current_period_start,
    subscription.current_period_end,
    subscription.expires_at,
    (
      subscription.status IN ('active', 'trial')
      AND (subscription.expires_at IS NULL OR subscription.expires_at > now())
    ),
    (
      subscription.current_period_end > now()
      AND subscription.requests_used >= subscription.monthly_request_limit
    )
  FROM (SELECT 1) seed
  LEFT JOIN public.tenant_ai_subscriptions subscription
    ON subscription.tenant_id = p_tenant_id
  LEFT JOIN public.ai_plans plan ON plan.code = subscription.plan_code;
$$;

REVOKE ALL ON FUNCTION public.get_ai_subscription_state(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_subscription_state(uuid, uuid)
  TO service_role;

NOTIFY pgrst, 'reload schema';
