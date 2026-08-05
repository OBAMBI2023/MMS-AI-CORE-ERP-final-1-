-- SAOVIA AI control centre: additive provider, secret, assignment and observability metadata.
CREATE TABLE IF NOT EXISTS public.ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
  provider text NOT NULL CHECK (provider IN ('gemini','openai','groq','anthropic','ollama')),
  base_url text, default_model text, timeout_ms integer NOT NULL DEFAULT 30000 CHECK (timeout_ms BETWEEN 1000 AND 300000),
  is_active boolean NOT NULL DEFAULT true, is_primary boolean NOT NULL DEFAULT false,
  fallback_order integer NOT NULL DEFAULT 0 CHECK (fallback_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ai_providers_one_primary ON public.ai_providers (is_primary) WHERE is_primary;

CREATE TABLE IF NOT EXISTS public.ai_provider_secrets (
  provider_id uuid PRIMARY KEY REFERENCES public.ai_providers(id) ON DELETE CASCADE,
  encrypted_secret text NOT NULL, key_hint text NOT NULL,
  rotated_at timestamptz NOT NULL DEFAULT now(), rotated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL, provider_id uuid REFERENCES public.ai_providers(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_models ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES public.ai_providers(id) ON DELETE SET NULL;
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS access_mode text NOT NULL DEFAULT 'read_only' CHECK (access_mode IN ('read_only','actions'));
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS confirmation_required boolean NOT NULL DEFAULT true;
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS token_limit integer NOT NULL DEFAULT 4096 CHECK (token_limit > 0);
ALTER TABLE public.tenant_ai_agents ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES public.ai_providers(id) ON DELETE SET NULL;
ALTER TABLE public.tenant_ai_agents ADD COLUMN IF NOT EXISTS model_id uuid REFERENCES public.ai_models(id) ON DELETE SET NULL;
ALTER TABLE public.tenant_ai_agents ADD COLUMN IF NOT EXISTS monthly_quota bigint CHECK (monthly_quota IS NULL OR monthly_quota >= 0);
ALTER TABLE public.tenant_ai_agents ADD COLUMN IF NOT EXISTS module_ids uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.tenant_ai_agents ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE public.ai_usage_logs ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.ai_agents(id) ON DELETE SET NULL;
ALTER TABLE public.ai_usage_logs ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE public.ai_usage_logs ADD COLUMN IF NOT EXISTS model text;
ALTER TABLE public.ai_usage_logs ADD COLUMN IF NOT EXISTS duration_ms integer CHECK (duration_ms IS NULL OR duration_ms >= 0);
ALTER TABLE public.ai_platform_settings ADD COLUMN IF NOT EXISTS default_provider_id uuid REFERENCES public.ai_providers(id) ON DELETE SET NULL;
ALTER TABLE public.ai_platform_settings ADD COLUMN IF NOT EXISTS fallback_provider_id uuid REFERENCES public.ai_providers(id) ON DELETE SET NULL;
ALTER TABLE public.ai_platform_settings ADD COLUMN IF NOT EXISTS global_timeout_ms integer NOT NULL DEFAULT 30000;
ALTER TABLE public.ai_platform_settings ADD COLUMN IF NOT EXISTS daily_limit integer;
ALTER TABLE public.ai_platform_settings ADD COLUMN IF NOT EXISTS alerts_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.ai_platform_settings ADD COLUMN IF NOT EXISTS maintenance_mode boolean NOT NULL DEFAULT false;

DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['ai_providers','ai_provider_secrets','ai_security_audit_logs'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', t);
  EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);
END LOOP; END $$;
DROP TRIGGER IF EXISTS trg_ai_providers_updated_at ON public.ai_providers;
CREATE TRIGGER trg_ai_providers_updated_at BEFORE UPDATE ON public.ai_providers FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
DROP TRIGGER IF EXISTS trg_ai_provider_secrets_updated_at ON public.ai_provider_secrets;
CREATE TRIGGER trg_ai_provider_secrets_updated_at BEFORE UPDATE ON public.ai_provider_secrets FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX IF NOT EXISTS tenant_ai_agents_provider_idx ON public.tenant_ai_agents(provider_id);
CREATE INDEX IF NOT EXISTS ai_usage_logs_observability_idx ON public.ai_usage_logs(created_at DESC, provider, status);
NOTIFY pgrst, 'reload schema';
