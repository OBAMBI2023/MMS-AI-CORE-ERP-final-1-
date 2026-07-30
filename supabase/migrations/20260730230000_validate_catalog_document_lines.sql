-- Additive enforcement for typed commercial document lines.
-- Historical free-text lines remain readable; new/changed linked lines are resolved
-- from the tenant catalogue before the tenant mode is checked.

ALTER TABLE public.devis_items
  ADD COLUMN IF NOT EXISTS item_type text,
  ADD COLUMN IF NOT EXISTS cost_price numeric(12,2) NOT NULL DEFAULT 0;

UPDATE public.devis_items item
SET item_type = catalog.type,
    cost_price = CASE WHEN catalog.type = 'product' THEN COALESCE(catalog.cost_price, 0) ELSE 0 END
FROM public.services catalog
WHERE catalog.id = item.service_id
  AND item.item_type IS NULL;

ALTER TABLE public.devis_items
  ADD CONSTRAINT devis_items_item_type_valid
  CHECK (item_type IS NULL OR item_type IN ('product', 'service')) NOT VALID;

CREATE OR REPLACE FUNCTION public.enforce_catalog_document_line()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  document_tenant_id uuid;
  resolved_type text;
  mode text;
BEGIN
  IF TG_TABLE_NAME = 'vente_items' THEN
    SELECT tenant_id INTO document_tenant_id FROM public.ventes WHERE id = NEW.vente_id;
  ELSE
    SELECT tenant_id INTO document_tenant_id FROM public.devis WHERE id = NEW.devis_id;
  END IF;

  IF document_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Document tenant not found' USING ERRCODE = '23503';
  END IF;
  IF NEW.service_id IS NULL THEN
    RAISE EXCEPTION 'A catalog item is required' USING ERRCODE = '23514';
  END IF;

  SELECT type INTO resolved_type
  FROM public.services
  WHERE id = NEW.service_id AND tenant_id = document_tenant_id;
  IF resolved_type IS NULL THEN
    RAISE EXCEPTION 'Catalog item inaccessible for document tenant' USING ERRCODE = '23503';
  END IF;

  SELECT catalog_mode INTO mode
  FROM public.tenant_catalog_settings
  WHERE tenant_id = document_tenant_id;
  IF mode IS NULL THEN
    RAISE EXCEPTION 'Tenant catalog settings missing' USING ERRCODE = '23514';
  END IF;
  IF (mode = 'products' AND resolved_type <> 'product')
     OR (mode = 'services' AND resolved_type <> 'service') THEN
    RAISE EXCEPTION 'Catalog item type disabled for tenant' USING ERRCODE = '42501';
  END IF;

  NEW.item_type := resolved_type;
  NEW.cost_price := CASE
    WHEN resolved_type = 'product'
      THEN COALESCE((SELECT cost_price FROM public.services WHERE id = NEW.service_id), 0)
    ELSE 0
  END;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_validate_vente_catalog_line ON public.vente_items;
CREATE TRIGGER trg_validate_vente_catalog_line
  BEFORE INSERT OR UPDATE OF vente_id, service_id, item_type ON public.vente_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_catalog_document_line();

DROP TRIGGER IF EXISTS trg_validate_devis_catalog_line ON public.devis_items;
CREATE TRIGGER trg_validate_devis_catalog_line
  BEFORE INSERT OR UPDATE OF devis_id, service_id, item_type ON public.devis_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_catalog_document_line();

REVOKE ALL ON FUNCTION public.enforce_catalog_document_line() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_catalog_document_line() TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_tenant_catalog_entity_mode()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mode text;
BEGIN
  SELECT catalog_mode INTO mode
  FROM public.tenant_catalog_settings
  WHERE tenant_id = NEW.tenant_id;
  IF mode IS NULL THEN
    RAISE EXCEPTION 'Tenant catalog settings missing' USING ERRCODE = '23514';
  END IF;
  IF (mode = 'products' AND NEW.type <> 'product')
     OR (mode = 'services' AND NEW.type <> 'service') THEN
    RAISE EXCEPTION 'Catalog entity type disabled for tenant' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_validate_catalog_entity_mode ON public.services;
CREATE TRIGGER trg_validate_catalog_entity_mode
  BEFORE INSERT OR UPDATE OF tenant_id, type ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_catalog_entity_mode();

DROP TRIGGER IF EXISTS trg_validate_catalog_category_mode ON public.catalog_categories;
CREATE TRIGGER trg_validate_catalog_category_mode
  BEFORE INSERT OR UPDATE OF tenant_id, type ON public.catalog_categories
  FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_catalog_entity_mode();

REVOKE ALL ON FUNCTION public.enforce_tenant_catalog_entity_mode() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_tenant_catalog_entity_mode() TO service_role;
