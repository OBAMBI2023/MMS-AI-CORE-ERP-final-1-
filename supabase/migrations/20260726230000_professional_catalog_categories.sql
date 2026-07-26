ALTER TABLE public.catalog_categories
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS catalog_categories_tenant_active_sort_idx
  ON public.catalog_categories (tenant_id, active, sort_order, name);

CREATE OR REPLACE FUNCTION public.touch_catalog_category()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_catalog_categories_touch ON public.catalog_categories;
CREATE TRIGGER trg_catalog_categories_touch
  BEFORE UPDATE ON public.catalog_categories
  FOR EACH ROW EXECUTE FUNCTION public.touch_catalog_category();

-- Keep the legacy label used by invoices, POS and reports synchronized while
-- category_id remains the catalogue source of truth.
CREATE OR REPLACE FUNCTION public.sync_catalog_category_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE public.services
    SET category = NEW.name
    WHERE tenant_id = NEW.tenant_id
      AND category_id = NEW.id;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_catalog_categories_sync_name ON public.catalog_categories;
CREATE TRIGGER trg_catalog_categories_sync_name
  AFTER UPDATE OF name ON public.catalog_categories
  FOR EACH ROW EXECUTE FUNCTION public.sync_catalog_category_name();

-- A category in use must never disappear through a direct DELETE.
ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_category_id_fkey;
ALTER TABLE public.services
  ADD CONSTRAINT services_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.catalog_categories(id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.replace_and_delete_catalog_category(
  source_category_id uuid,
  replacement_category_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  authenticated_tenant_id uuid := public.current_tenant_id();
BEGIN
  IF authenticated_tenant_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Tenant authentifie requis';
  END IF;
  IF source_category_id = replacement_category_id THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'La categorie de remplacement doit etre differente';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.catalog_categories
    WHERE id = source_category_id AND tenant_id = authenticated_tenant_id
  ) OR NOT EXISTS (
    SELECT 1 FROM public.catalog_categories
    WHERE id = replacement_category_id
      AND tenant_id = authenticated_tenant_id
      AND active
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Categorie inaccessible';
  END IF;

  UPDATE public.services
  SET category_id = replacement_category_id
  WHERE tenant_id = authenticated_tenant_id
    AND category_id = source_category_id;

  DELETE FROM public.catalog_categories
  WHERE id = source_category_id
    AND tenant_id = authenticated_tenant_id;
END
$$;

REVOKE ALL ON FUNCTION public.replace_and_delete_catalog_category(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_and_delete_catalog_category(uuid, uuid)
  TO authenticated, service_role;

