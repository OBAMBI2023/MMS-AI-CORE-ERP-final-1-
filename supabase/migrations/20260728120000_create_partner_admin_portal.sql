-- Partner administrators are a platform-level audience, isolated from tenant RBAC
-- and from platform administrators. All application reads use the authenticated
-- user's JWT and these RLS policies (never the service role).
CREATE TABLE IF NOT EXISTS public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  code text NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9][a-z0-9_-]*$'),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_users (
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (partner_id, user_id),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.partner_tenants (
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (partner_id, tenant_id)
);

CREATE TABLE IF NOT EXISTS public.partner_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (length(btrim(action)) > 0),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_tenants_tenant_id_idx
  ON public.partner_tenants (tenant_id);
CREATE INDEX IF NOT EXISTS partner_activity_logs_partner_created_idx
  ON public.partner_activity_logs (partner_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.current_partner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT partner_user.partner_id
  FROM public.partner_users partner_user
  JOIN public.partners partner ON partner.id = partner_user.partner_id
  WHERE partner_user.user_id = auth.uid()
    AND partner.is_active
    AND NOT EXISTS (
      SELECT 1
      FROM public.platform_admins platform_admin
      WHERE platform_admin.user_id = auth.uid()
    )
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.partner_can_read_tenant(requested_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.partner_tenants assignment
    WHERE assignment.partner_id = public.current_partner_id()
      AND assignment.tenant_id = requested_tenant_id
  )
$$;

REVOKE ALL ON FUNCTION public.current_partner_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.partner_can_read_tenant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_partner_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.partner_can_read_tenant(uuid) TO authenticated, service_role;

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_activity_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.partners, public.partner_users, public.partner_tenants,
  public.partner_activity_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.partners, public.partner_users, public.partner_tenants,
  public.partner_activity_logs TO authenticated;
GRANT INSERT ON TABLE public.partner_activity_logs TO authenticated;
GRANT ALL ON TABLE public.partners, public.partner_users, public.partner_tenants,
  public.partner_activity_logs TO service_role;

CREATE POLICY "partners_read_own"
  ON public.partners FOR SELECT TO authenticated
  USING (id = public.current_partner_id());

CREATE POLICY "partner_users_read_own"
  ON public.partner_users FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND partner_id = public.current_partner_id());

CREATE POLICY "partner_tenants_read_assigned"
  ON public.partner_tenants FOR SELECT TO authenticated
  USING (partner_id = public.current_partner_id());

CREATE POLICY "partner_activity_logs_read_own_partner"
  ON public.partner_activity_logs FOR SELECT TO authenticated
  USING (partner_id = public.current_partner_id());

CREATE POLICY "partner_activity_logs_insert_self"
  ON public.partner_activity_logs FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND partner_id = public.current_partner_id()
    AND (tenant_id IS NULL OR public.partner_can_read_tenant(tenant_id))
  );

-- Extend existing tenant data policies with a read-only partner path.
CREATE POLICY "tenants_read_assigned_partner"
  ON public.tenants FOR SELECT TO authenticated
  USING (public.partner_can_read_tenant(id));

CREATE POLICY "subscriptions_read_assigned_partner"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (public.partner_can_read_tenant(tenant_id));

CREATE POLICY "tenant_modules_read_assigned_partner"
  ON public.tenant_modules FOR SELECT TO authenticated
  USING (public.partner_can_read_tenant(tenant_id));
