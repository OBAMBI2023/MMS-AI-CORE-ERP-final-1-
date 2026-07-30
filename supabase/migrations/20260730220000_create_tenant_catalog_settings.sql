CREATE TABLE IF NOT EXISTS public.tenant_catalog_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  catalog_mode text NOT NULL DEFAULT 'mixed'
    CHECK (catalog_mode IN ('products', 'services', 'mixed')),
  stock_enabled boolean NOT NULL DEFAULT true,
  purchases_enabled boolean NOT NULL DEFAULT true,
  suppliers_enabled boolean NOT NULL DEFAULT true,
  services_in_sales_enabled boolean NOT NULL DEFAULT true,
  products_in_sales_enabled boolean NOT NULL DEFAULT true,
  catalog_codes_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.tenant_catalog_settings (tenant_id)
SELECT id FROM public.tenants
ON CONFLICT (tenant_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.assign_default_catalog_settings_to_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tenant_catalog_settings (tenant_id)
  VALUES (NEW.id)
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_assign_default_catalog_settings_to_tenant ON public.tenants;
CREATE TRIGGER trg_assign_default_catalog_settings_to_tenant
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_catalog_settings_to_tenant();

ALTER TABLE public.tenant_catalog_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.tenant_catalog_settings FROM anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.tenant_catalog_settings TO authenticated;
GRANT ALL ON TABLE public.tenant_catalog_settings TO service_role;

DROP POLICY IF EXISTS "catalog_settings_read_own_tenant" ON public.tenant_catalog_settings;
CREATE POLICY "catalog_settings_read_own_tenant"
  ON public.tenant_catalog_settings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles profile
      WHERE profile.id = auth.uid()
        AND profile.tenant_id = tenant_catalog_settings.tenant_id
    )
    OR EXISTS (
      SELECT 1 FROM public.platform_admins admin
      WHERE admin.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "catalog_settings_update_authorized_admin" ON public.tenant_catalog_settings;
CREATE POLICY "catalog_settings_update_authorized_admin"
  ON public.tenant_catalog_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles profile
      JOIN public.roles role ON role.id = profile.role_id
      JOIN public.role_permissions assignment ON assignment.role_id = role.id
      JOIN public.permissions permission ON permission.id = assignment.permission_id
      WHERE profile.id = auth.uid()
        AND profile.tenant_id = tenant_catalog_settings.tenant_id
        AND role.tenant_id = profile.tenant_id
        AND permission.code = 'settings.manage'
    )
    OR EXISTS (
      SELECT 1 FROM public.platform_admins admin
      WHERE admin.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles profile
      JOIN public.roles role ON role.id = profile.role_id
      JOIN public.role_permissions assignment ON assignment.role_id = role.id
      JOIN public.permissions permission ON permission.id = assignment.permission_id
      WHERE profile.id = auth.uid()
        AND profile.tenant_id = tenant_catalog_settings.tenant_id
        AND role.tenant_id = profile.tenant_id
        AND permission.code = 'settings.manage'
    )
    OR EXISTS (
      SELECT 1 FROM public.platform_admins admin
      WHERE admin.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.current_user_catalog_route_enabled(requested_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT CASE
      WHEN requested_path = '/stock'
        THEN settings.catalog_mode <> 'services' AND settings.stock_enabled
      WHEN requested_path = '/achats'
        THEN settings.catalog_mode <> 'services' AND settings.purchases_enabled
      WHEN requested_path = '/fournisseurs'
        THEN settings.catalog_mode <> 'services' AND settings.suppliers_enabled
      ELSE true
    END
    FROM public.profiles profile
    JOIN public.tenant_catalog_settings settings ON settings.tenant_id = profile.tenant_id
    WHERE profile.id = auth.uid()
  ), false);
$$;

REVOKE ALL ON FUNCTION public.assign_default_catalog_settings_to_tenant() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_default_catalog_settings_to_tenant() TO service_role;
REVOKE ALL ON FUNCTION public.current_user_catalog_route_enabled(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_catalog_route_enabled(text) TO authenticated, service_role;
