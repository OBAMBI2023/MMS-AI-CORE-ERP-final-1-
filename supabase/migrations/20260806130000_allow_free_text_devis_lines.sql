-- Regression fix: 20260730230000_validate_catalog_document_lines.sql made
-- trg_validate_devis_catalog_line reject any devis_items row with a NULL
-- service_id ("A catalog item is required"), which silently blocked the
-- free-text designation mode the Devis form is supposed to support (users
-- can type a custom line like "Installation climatiseur" that has no match
-- in the tenant catalogue). vente_items (POS) keeps the strict catalog-only
-- requirement unchanged, since sales lines drive stock/cost accounting.

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
    IF TG_TABLE_NAME = 'devis_items' THEN
      -- Free-text designation line: not linked to the catalogue.
      NEW.item_type := 'service';
      NEW.cost_price := 0;
      RETURN NEW;
    END IF;
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

REVOKE ALL ON FUNCTION public.enforce_catalog_document_line() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_catalog_document_line() TO service_role;
