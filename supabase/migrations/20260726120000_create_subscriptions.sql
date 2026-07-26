-- Subscriptions are platform-owned records. Tenant users can read only the
-- subscription attached to their tenant; mutations use the trusted server.
DO $$
BEGIN
  CREATE TYPE public.subscription_status AS ENUM (
    'trial',
    'active',
    'expired',
    'suspended'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.subscription_billing_cycle AS ENUM (
    'monthly',
    'quarterly',
    'yearly'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  billing_cycle public.subscription_billing_cycle NOT NULL DEFAULT 'monthly',
  status public.subscription_status NOT NULL DEFAULT 'trial',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_trial_dates_valid CHECK (
    trial_started_at IS NULL OR trial_ends_at IS NULL OR trial_ends_at > trial_started_at
  ),
  CONSTRAINT subscriptions_active_dates_valid CHECK (
    starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at
  )
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends_at
  ON public.subscriptions(trial_ends_at)
  WHERE status = 'trial';
CREATE INDEX IF NOT EXISTS idx_subscriptions_ends_at
  ON public.subscriptions(ends_at)
  WHERE status = 'active';

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.create_tenant_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (
    tenant_id, trial_started_at, trial_ends_at, amount, billing_cycle, status
  )
  VALUES (
    NEW.id, now(), now() + interval '7 days', 0, 'monthly', 'trial'
  )
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_tenant_trial ON public.tenants;
CREATE TRIGGER trg_create_tenant_trial
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.create_tenant_trial();

-- Existing tenants receive a real subscription derived from their actual
-- creation timestamp. Old trials therefore enter the expired state below.
INSERT INTO public.subscriptions (
  tenant_id, trial_started_at, trial_ends_at, amount, billing_cycle, status
)
SELECT
  tenant.id,
  tenant.created_at,
  tenant.created_at + interval '7 days',
  0,
  'monthly',
  CASE
    WHEN tenant.created_at + interval '7 days' <= now() THEN 'expired'
    ELSE 'trial'
  END::public.subscription_status
FROM public.tenants tenant
ON CONFLICT (tenant_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.expire_due_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_rows integer;
BEGIN
  UPDATE public.subscriptions
  SET status = 'expired'
  WHERE
    (status = 'trial' AND trial_ends_at <= now())
    OR (status = 'active' AND ends_at IS NOT NULL AND ends_at <= now());

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_due_subscriptions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_due_subscriptions() TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.subscriptions FROM anon, authenticated;
GRANT SELECT ON TABLE public.subscriptions TO authenticated;
GRANT ALL ON TABLE public.subscriptions TO service_role;

DROP POLICY IF EXISTS "subscriptions_read_current_tenant"
  ON public.subscriptions;
CREATE POLICY "subscriptions_read_current_tenant"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_tenant_id());
