CREATE OR REPLACE FUNCTION public.decrement_catalog_stock_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sale_tenant_id uuid;
  catalog_type text;
  catalog_stock numeric;
BEGIN
  IF NEW.service_id IS NULL THEN RETURN NEW; END IF;

  SELECT tenant_id INTO sale_tenant_id
  FROM public.ventes
  WHERE id = NEW.vente_id;

  IF sale_tenant_id IS NULL OR sale_tenant_id <> public.current_tenant_id() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Vente inaccessible';
  END IF;

  SELECT type, stock
  INTO catalog_type, catalog_stock
  FROM public.services
  WHERE id = NEW.service_id
    AND tenant_id = sale_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Article de catalogue inaccessible';
  END IF;

  -- Services and products without stock management never change stock.
  IF catalog_type <> 'product' OR catalog_stock IS NULL THEN RETURN NEW; END IF;

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
