CREATE OR REPLACE FUNCTION public.decrement_catalog_stock_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sale_tenant_id uuid;
  managed_product boolean;
BEGIN
  IF NEW.service_id IS NULL THEN RETURN NEW; END IF;

  SELECT tenant_id INTO sale_tenant_id
  FROM public.ventes
  WHERE id = NEW.vente_id;

  IF sale_tenant_id IS NULL OR sale_tenant_id <> public.current_tenant_id() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Vente inaccessible';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.services
    WHERE id = NEW.service_id
      AND tenant_id = sale_tenant_id
      AND type = 'product'
      AND stock IS NOT NULL
  ) INTO managed_product;

  IF NOT managed_product THEN RETURN NEW; END IF;

  UPDATE public.services
  SET stock = stock - NEW.qty
  WHERE id = NEW.service_id
    AND tenant_id = sale_tenant_id
    AND type = 'product'
    AND stock IS NOT NULL
    AND stock >= NEW.qty;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Stock insuffisant pour cet article';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_decrement_catalog_stock_on_sale ON public.vente_items;
CREATE TRIGGER trg_decrement_catalog_stock_on_sale
  BEFORE INSERT ON public.vente_items
  FOR EACH ROW EXECUTE FUNCTION public.decrement_catalog_stock_on_sale();

REVOKE ALL ON FUNCTION public.decrement_catalog_stock_on_sale() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_catalog_stock_on_sale() TO service_role;
