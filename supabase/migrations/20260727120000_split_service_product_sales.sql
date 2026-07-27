-- Snapshot the accounting nature and prices of each sale line.
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS cost_price numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.vente_items
  ADD COLUMN IF NOT EXISTS item_type text,
  ADD COLUMN IF NOT EXISTS cost_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS selling_price numeric(12,2);

UPDATE public.vente_items AS item
SET item_type = COALESCE(service.type, 'service'),
    cost_price = CASE WHEN service.type = 'product' THEN COALESCE(service.cost_price, 0) ELSE 0 END,
    selling_price = item.price
FROM public.services AS service
WHERE service.id = item.service_id
  AND (item.item_type IS NULL OR item.cost_price IS NULL OR item.selling_price IS NULL);

UPDATE public.vente_items
SET item_type = COALESCE(item_type, 'service'),
    cost_price = COALESCE(cost_price, 0),
    selling_price = COALESCE(selling_price, price)
WHERE item_type IS NULL OR cost_price IS NULL OR selling_price IS NULL;

ALTER TABLE public.vente_items
  ALTER COLUMN item_type SET DEFAULT 'service',
  ALTER COLUMN item_type SET NOT NULL,
  ALTER COLUMN cost_price SET DEFAULT 0,
  ALTER COLUMN cost_price SET NOT NULL,
  ALTER COLUMN selling_price SET DEFAULT 0,
  ALTER COLUMN selling_price SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'services_cost_price_nonnegative' AND conrelid = 'public.services'::regclass) THEN
    ALTER TABLE public.services ADD CONSTRAINT services_cost_price_nonnegative CHECK (cost_price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vente_items_item_type_valid' AND conrelid = 'public.vente_items'::regclass) THEN
    ALTER TABLE public.vente_items ADD CONSTRAINT vente_items_item_type_valid CHECK (item_type IN ('service', 'product'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vente_items_cost_price_nonnegative' AND conrelid = 'public.vente_items'::regclass) THEN
    ALTER TABLE public.vente_items ADD CONSTRAINT vente_items_cost_price_nonnegative CHECK (cost_price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vente_items_selling_price_nonnegative' AND conrelid = 'public.vente_items'::regclass) THEN
    ALTER TABLE public.vente_items ADD CONSTRAINT vente_items_selling_price_nonnegative CHECK (selling_price >= 0);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_vente_items_item_type ON public.vente_items (item_type);

CREATE OR REPLACE FUNCTION public.decrement_catalog_stock_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sale_tenant_id uuid;
  catalog_item public.services%ROWTYPE;
  previous_stock numeric(14,3);
  resulting_stock numeric(14,3);
BEGIN
  SELECT tenant_id INTO sale_tenant_id FROM public.ventes WHERE id = NEW.vente_id;
  IF sale_tenant_id IS NULL OR sale_tenant_id <> public.current_tenant_id() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Vente inaccessible';
  END IF;

  IF NEW.service_id IS NOT NULL THEN
    SELECT * INTO catalog_item FROM public.services
    WHERE id = NEW.service_id AND tenant_id = sale_tenant_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Article de catalogue inaccessible';
    END IF;
    NEW.item_type := catalog_item.type;
    NEW.cost_price := CASE WHEN catalog_item.type = 'product' THEN catalog_item.cost_price ELSE 0 END;
    NEW.selling_price := NEW.price;
  END IF;

  IF NEW.item_type <> 'product' OR NEW.service_id IS NULL THEN RETURN NEW; END IF;

  SELECT stock INTO previous_stock FROM public.services
  WHERE id = NEW.service_id AND tenant_id = sale_tenant_id
    AND type = 'product' AND manage_stock
  FOR UPDATE;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF previous_stock < NEW.qty THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Stock insuffisant pour cet article';
  END IF;

  resulting_stock := previous_stock - NEW.qty;
  UPDATE public.services SET stock = resulting_stock WHERE id = NEW.service_id;
  INSERT INTO public.inventory_movements (
    tenant_id, service_id, movement_type, quantity, quantity_delta,
    stock_before, stock_after, reason, source, user_id
  ) VALUES (
    sale_tenant_id, NEW.service_id, 'exit', NEW.qty, -NEW.qty,
    previous_stock, resulting_stock, 'Vente POS', 'pos', auth.uid()
  );
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION public.decrement_catalog_stock_on_sale() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_catalog_stock_on_sale() TO service_role;

-- Make the new columns immediately visible to PostgREST.
NOTIFY pgrst, 'reload schema';
