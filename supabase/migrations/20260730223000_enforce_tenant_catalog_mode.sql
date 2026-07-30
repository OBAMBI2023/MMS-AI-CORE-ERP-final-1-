CREATE OR REPLACE FUNCTION public.enforce_current_tenant_catalog_item_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_tenant_id uuid;
  actor_mode text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT profile.tenant_id, settings.catalog_mode
  INTO actor_tenant_id, actor_mode
  FROM public.profiles profile
  JOIN public.tenant_catalog_settings settings ON settings.tenant_id = profile.tenant_id
  WHERE profile.id = auth.uid();

  IF actor_tenant_id IS NULL OR NEW.tenant_id IS DISTINCT FROM actor_tenant_id THEN
    RAISE EXCEPTION 'Catalogue tenant access denied' USING ERRCODE = '42501';
  END IF;
  IF (actor_mode = 'products' AND NEW.type <> 'product')
    OR (actor_mode = 'services' AND NEW.type <> 'service') THEN
    RAISE EXCEPTION 'Catalogue item type disabled for tenant' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_enforce_current_tenant_catalog_item_type ON public.services;
CREATE TRIGGER trg_enforce_current_tenant_catalog_item_type
  BEFORE INSERT OR UPDATE OF type, tenant_id ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.enforce_current_tenant_catalog_item_type();

DROP POLICY IF EXISTS "catalog_settings_platform_admin_full_access" ON public.tenant_catalog_settings;
CREATE POLICY "catalog_settings_platform_admin_full_access"
  ON public.tenant_catalog_settings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.platform_admins admin WHERE admin.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.platform_admins admin WHERE admin.user_id = auth.uid()));

REVOKE ALL ON FUNCTION public.enforce_current_tenant_catalog_item_type() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_current_tenant_catalog_item_type() TO service_role;
