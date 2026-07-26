-- catalog_categories has no category_id column. Keep its tenant assignment
-- separate from the services trigger so PostgreSQL never resolves
-- NEW.category_id against a catalog_categories record.

CREATE OR REPLACE FUNCTION public.set_catalog_category_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  authenticated_tenant_id uuid;
BEGIN
  authenticated_tenant_id := public.current_tenant_id();
  IF authenticated_tenant_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Tenant authentifié requis';
  END IF;

  NEW.tenant_id := authenticated_tenant_id;
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION public.set_catalog_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  authenticated_tenant_id uuid;
  selected_category_name text;
BEGIN
  authenticated_tenant_id := public.current_tenant_id();
  IF authenticated_tenant_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Tenant authentifié requis';
  END IF;

  -- services.category_id is the catalogue foreign key. Resolve it inside a
  -- services-only trigger and keep the legacy category label synchronized.
  IF NEW.category_id IS NOT NULL THEN
    SELECT name
    INTO selected_category_name
    FROM public.catalog_categories
    WHERE id = NEW.category_id
      AND tenant_id = authenticated_tenant_id;

    IF selected_category_name IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'Catégorie inaccessible';
    END IF;

    NEW.category := selected_category_name;
  END IF;

  -- The authenticated tenant always wins over a client-supplied tenant_id.
  NEW.tenant_id := authenticated_tenant_id;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_catalog_categories_set_tenant
  ON public.catalog_categories;
CREATE TRIGGER trg_catalog_categories_set_tenant
  BEFORE INSERT OR UPDATE ON public.catalog_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_catalog_category_tenant();

DROP TRIGGER IF EXISTS trg_services_set_catalog_tenant
  ON public.services;
CREATE TRIGGER trg_services_set_catalog_tenant
  BEFORE INSERT OR UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_catalog_tenant();

REVOKE ALL ON FUNCTION public.set_catalog_category_tenant()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_catalog_category_tenant()
  TO service_role;
