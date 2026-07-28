-- IA Platform control plane. Existing ERP tables, routes, RLS and RBAC remain untouched.
CREATE TABLE IF NOT EXISTS public.ai_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google', 'mistral', 'ollama')),
  name text NOT NULL,
  model_key text NOT NULL,
  input_cost_per_million numeric(14,6) NOT NULL DEFAULT 0 CHECK (input_cost_per_million >= 0),
  output_cost_per_million numeric(14,6) NOT NULL DEFAULT 0 CHECK (output_cost_per_million >= 0),
  context_window integer CHECK (context_window IS NULL OR context_window > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, model_key)
);

CREATE TABLE IF NOT EXISTS public.ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9_]+$'),
  description text,
  model_id uuid REFERENCES public.ai_models(id) ON DELETE SET NULL,
  system_prompt text,
  temperature numeric(3,2) NOT NULL DEFAULT 0.2 CHECK (temperature BETWEEN 0 AND 2),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_agent_modules (
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.erp_modules(id) ON DELETE CASCADE,
  PRIMARY KEY (agent_id, module_id)
);

CREATE TABLE IF NOT EXISTS public.ai_agent_plans (
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  plan_code text NOT NULL REFERENCES public.ai_plans(code) ON DELETE CASCADE,
  PRIMARY KEY (agent_id, plan_code)
);

CREATE TABLE IF NOT EXISTS public.ai_plan_quotas (
  plan_code text PRIMARY KEY REFERENCES public.ai_plans(code) ON DELETE CASCADE,
  monthly_requests integer NOT NULL CHECK (monthly_requests > 0),
  monthly_tokens bigint NOT NULL CHECK (monthly_tokens > 0),
  included_credits numeric(14,2) NOT NULL DEFAULT 0 CHECK (included_credits >= 0),
  max_agents integer CHECK (max_agents IS NULL OR max_agents > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_platform_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  default_model_id uuid REFERENCES public.ai_models(id) ON DELETE SET NULL,
  logging_enabled boolean NOT NULL DEFAULT true,
  retention_days integer NOT NULL DEFAULT 90 CHECK (retention_days BETWEEN 1 AND 3650),
  monthly_budget numeric(14,2) CHECK (monthly_budget IS NULL OR monthly_budget >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tenant_ai_agents (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, agent_id)
);

CREATE TABLE IF NOT EXISTS public.tenant_ai_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount <> 0),
  transaction_type text NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'adjustment', 'refund')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ai_models (provider, name, model_key, context_window)
VALUES
  ('openai', 'GPT-4.1 mini', 'gpt-4.1-mini', 1047576),
  ('anthropic', 'Claude Sonnet', 'claude-sonnet-4-5', 200000),
  ('google', 'Gemini Flash', 'gemini-2.5-flash', 1048576),
  ('mistral', 'Mistral Small', 'mistral-small-latest', 128000),
  ('ollama', 'Llama local', 'llama3.3', 131072)
ON CONFLICT (provider, model_key) DO NOTHING;

INSERT INTO public.ai_plan_quotas (plan_code, monthly_requests, monthly_tokens, included_credits, max_agents)
VALUES
  ('starter', 500, 1000000, 0, 2),
  ('pro', 5000, 15000000, 25, 10),
  ('enterprise', 50000, 200000000, 250, NULL)
ON CONFLICT (plan_code) DO NOTHING;

INSERT INTO public.ai_platform_settings (id, logging_enabled, retention_days)
VALUES (true, true, 90)
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'ai_models', 'ai_agents', 'ai_agent_modules', 'ai_agent_plans',
    'ai_plan_quotas', 'ai_platform_settings', 'tenant_ai_agents',
    'tenant_ai_credit_transactions'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', table_name);
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS trg_ai_models_updated_at ON public.ai_models;
CREATE TRIGGER trg_ai_models_updated_at BEFORE UPDATE ON public.ai_models
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
DROP TRIGGER IF EXISTS trg_ai_agents_updated_at ON public.ai_agents;
CREATE TRIGGER trg_ai_agents_updated_at BEFORE UPDATE ON public.ai_agents
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
DROP TRIGGER IF EXISTS trg_ai_plan_quotas_updated_at ON public.ai_plan_quotas;
CREATE TRIGGER trg_ai_plan_quotas_updated_at BEFORE UPDATE ON public.ai_plan_quotas
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
DROP TRIGGER IF EXISTS trg_ai_platform_settings_updated_at ON public.ai_platform_settings;
CREATE TRIGGER trg_ai_platform_settings_updated_at BEFORE UPDATE ON public.ai_platform_settings
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

NOTIFY pgrst, 'reload schema';
