CREATE TABLE IF NOT EXISTS public.erp_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tenant_modules (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.erp_modules(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  CONSTRAINT tenant_modules_pkey PRIMARY KEY (tenant_id, module_id),
  CONSTRAINT tenant_modules_tenant_module_key UNIQUE (tenant_id, module_id)
);

CREATE INDEX IF NOT EXISTS tenant_modules_module_id_idx
  ON public.tenant_modules(module_id);

INSERT INTO public.erp_modules (code, name, description, icon, sort_order)
VALUES
  ('dashboard', 'Dashboard', 'Tableau de bord et indicateurs', 'Home', 10),
  ('sales', 'Ventes', 'Ventes et point de vente', 'Wallet', 20),
  ('products_services', 'Produits & Services', 'Catalogue de produits et services', 'Briefcase', 30),
  ('customers', 'Clients', 'Gestion des clients', 'Users', 40),
  ('suppliers', 'Fournisseurs', 'Gestion des fournisseurs', 'Handshake', 50),
  ('purchases', 'Achats', 'Gestion des achats', 'ShoppingCart', 60),
  ('expenses', 'Dépenses', 'Gestion des dépenses', 'Receipt', 70),
  ('quotes', 'Devis', 'Gestion des devis', 'FileText', 80),
  ('reports', 'Rapports', 'Rapports et analyses', 'TrendingUp', 90),
  ('settings', 'Paramètres', 'Paramètres du tenant', 'Settings', 100),
  ('users', 'Utilisateurs', 'Gestion des utilisateurs', 'UserCog', 110)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.tenant_modules (tenant_id, module_id, enabled)
SELECT tenant.id, module.id, true
FROM public.tenants tenant
CROSS JOIN public.erp_modules module
ON CONFLICT (tenant_id, module_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.assign_default_modules_to_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tenant_modules (tenant_id, module_id, enabled)
  SELECT NEW.id, module.id, true
  FROM public.erp_modules module
  WHERE module.is_active
  ON CONFLICT (tenant_id, module_id) DO NOTHING;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_assign_default_modules_to_tenant ON public.tenants;
CREATE TRIGGER trg_assign_default_modules_to_tenant
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_modules_to_tenant();

CREATE OR REPLACE FUNCTION public.current_user_module_enabled(requested_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles profile
    JOIN public.tenant_modules tenant_module
      ON tenant_module.tenant_id = profile.tenant_id
    JOIN public.erp_modules module
      ON module.id = tenant_module.module_id
    WHERE profile.id = auth.uid()
      AND module.code = requested_code
      AND module.is_active
      AND tenant_module.enabled
  );
$$;

ALTER TABLE public.erp_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.erp_modules FROM anon, authenticated;
REVOKE ALL ON TABLE public.tenant_modules FROM anon, authenticated;
GRANT SELECT ON TABLE public.erp_modules TO authenticated;
GRANT SELECT ON TABLE public.tenant_modules TO authenticated;
GRANT ALL ON TABLE public.erp_modules TO service_role;
GRANT ALL ON TABLE public.tenant_modules TO service_role;

DROP POLICY IF EXISTS "erp_modules_read_assigned" ON public.erp_modules;
CREATE POLICY "erp_modules_read_assigned"
  ON public.erp_modules
  FOR SELECT
  TO authenticated
  USING (is_active);

DROP POLICY IF EXISTS "tenant_modules_read_own" ON public.tenant_modules;
CREATE POLICY "tenant_modules_read_own"
  ON public.tenant_modules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles profile
      WHERE profile.id = auth.uid()
        AND profile.tenant_id = tenant_modules.tenant_id
    )
  );

REVOKE ALL ON FUNCTION public.assign_default_modules_to_tenant() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_default_modules_to_tenant() TO service_role;
REVOKE ALL ON FUNCTION public.current_user_module_enabled(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_module_enabled(text) TO authenticated, service_role;
