-- Module Stock universel : catalogue, mouvements atomiques et journal POS.

INSERT INTO public.erp_modules (code, name, description, icon, sort_order, is_active)
VALUES (
  'inventory',
  'Stock',
  'Suivi du stock, mouvements et alertes de stock faible',
  'Boxes',
  35,
  true
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- Le module est opt-in pour les tenants déjà créés. Le mécanisme existant
-- l'attribuera automatiquement aux futurs tenants.
INSERT INTO public.tenant_modules (tenant_id, module_id, enabled)
SELECT tenant.id, module.id, false
FROM public.tenants tenant
JOIN public.erp_modules module ON module.code = 'inventory'
ON CONFLICT (tenant_id, module_id) DO NOTHING;

-- Stock est activé dès le déploiement pour le tenant historique MMS.
INSERT INTO public.tenant_modules (tenant_id, module_id, enabled)
SELECT tenant.id, module.id, true
FROM public.tenants tenant
JOIN public.erp_modules module ON module.code = 'inventory'
WHERE lower(trim(tenant.name)) = lower('Maguy Multi Services')
ON CONFLICT (tenant_id, module_id) DO UPDATE SET enabled = EXCLUDED.enabled;

CREATE OR REPLACE FUNCTION public.assign_default_modules_to_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tenant_modules (tenant_id, module_id, enabled)
  SELECT NEW.id, module.id, module.code <> 'inventory'
  FROM public.erp_modules module
  WHERE module.is_active
  ON CONFLICT (tenant_id, module_id) DO NOTHING;
  RETURN NEW;
END
$$;

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS manage_stock boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_alert_threshold numeric(14,3) NOT NULL DEFAULT 0;

-- Ces mises à niveau sont administratives et portent sur plusieurs tenants.
-- Le trigger est réactivé dans la même transaction avant toute validation.
ALTER TABLE public.services DISABLE TRIGGER trg_services_set_catalog_tenant;

UPDATE public.services
SET manage_stock = true
WHERE type = 'product'
  AND stock IS NOT NULL;

UPDATE public.services
SET manage_stock = false,
    stock = NULL
WHERE type <> 'product';

ALTER TABLE public.services ENABLE TRIGGER trg_services_set_catalog_tenant;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'services_stock_management_valid'
      AND conrelid = 'public.services'::regclass
  ) THEN
    ALTER TABLE public.services
      ADD CONSTRAINT services_stock_management_valid CHECK (
        (type = 'product' AND manage_stock AND stock IS NOT NULL)
        OR (NOT manage_stock AND stock IS NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'services_stock_alert_threshold_nonnegative'
      AND conrelid = 'public.services'::regclass
  ) THEN
    ALTER TABLE public.services
      ADD CONSTRAINT services_stock_alert_threshold_nonnegative
      CHECK (stock_alert_threshold >= 0);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS services_inventory_idx
  ON public.services (tenant_id, stock, stock_alert_threshold)
  WHERE type = 'product' AND manage_stock;

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  movement_type text NOT NULL
    CHECK (movement_type IN ('entry', 'exit', 'adjustment')),
  quantity numeric(14,3) NOT NULL CHECK (quantity > 0),
  quantity_delta numeric(14,3) NOT NULL CHECK (quantity_delta <> 0),
  stock_before numeric(14,3) NOT NULL CHECK (stock_before >= 0),
  stock_after numeric(14,3) NOT NULL CHECK (stock_after >= 0),
  reason text NOT NULL CHECK (btrim(reason) <> ''),
  source text NOT NULL CHECK (btrim(source) <> ''),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_movements_tenant_date_idx
  ON public.inventory_movements (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_movements_service_date_idx
  ON public.inventory_movements (service_id, created_at DESC);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.inventory_movements FROM anon, authenticated;
GRANT SELECT ON TABLE public.inventory_movements TO authenticated;
GRANT ALL ON TABLE public.inventory_movements TO service_role;

DROP POLICY IF EXISTS "inventory_movements_read_own" ON public.inventory_movements;
CREATE POLICY "inventory_movements_read_own"
  ON public.inventory_movements
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_user_module_enabled('inventory')
    AND public.has_permission('ventes.view')
  );

CREATE OR REPLACE FUNCTION public.apply_inventory_movement(
  requested_service_id uuid,
  requested_type text,
  requested_quantity numeric,
  requested_reason text,
  requested_source text DEFAULT 'manual'
)
RETURNS public.inventory_movements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  authenticated_tenant_id uuid;
  authenticated_user_id uuid;
  inventory_item public.services%ROWTYPE;
  previous_stock numeric(14,3);
  next_stock numeric(14,3);
  stock_delta numeric(14,3);
  created_movement public.inventory_movements;
BEGIN
  authenticated_tenant_id := public.current_tenant_id();
  authenticated_user_id := auth.uid();

  IF authenticated_tenant_id IS NULL OR authenticated_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Session authentifiée requise';
  END IF;
  IF NOT public.current_user_module_enabled('inventory') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Module Stock désactivé';
  END IF;
  IF NOT public.has_permission('ventes.create') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Permission insuffisante';
  END IF;
  IF requested_type NOT IN ('entry', 'exit', 'adjustment') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Type de mouvement invalide';
  END IF;
  IF requested_quantity IS NULL OR requested_quantity < 0
     OR (requested_type <> 'adjustment' AND requested_quantity = 0) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quantité invalide';
  END IF;
  IF btrim(coalesce(requested_reason, '')) = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Motif requis';
  END IF;
  IF btrim(coalesce(requested_source, '')) = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Source requise';
  END IF;

  SELECT *
  INTO inventory_item
  FROM public.services
  WHERE id = requested_service_id
    AND tenant_id = authenticated_tenant_id
    AND type = 'product'
    AND manage_stock
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Produit géré en stock inaccessible';
  END IF;

  previous_stock := inventory_item.stock;
  IF requested_type = 'entry' THEN
    next_stock := previous_stock + requested_quantity;
  ELSIF requested_type = 'exit' THEN
    next_stock := previous_stock - requested_quantity;
  ELSE
    -- Pour un ajustement, la quantité demandée est le nouveau stock constaté.
    next_stock := requested_quantity;
  END IF;

  IF next_stock < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Stock insuffisant';
  END IF;

  stock_delta := next_stock - previous_stock;
  IF stock_delta = 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Aucun changement de stock';
  END IF;

  UPDATE public.services
  SET stock = next_stock
  WHERE id = inventory_item.id;

  INSERT INTO public.inventory_movements (
    tenant_id, service_id, movement_type, quantity, quantity_delta,
    stock_before, stock_after, reason, source, user_id
  )
  VALUES (
    authenticated_tenant_id,
    inventory_item.id,
    requested_type,
    abs(stock_delta),
    stock_delta,
    previous_stock,
    next_stock,
    btrim(requested_reason),
    btrim(requested_source),
    authenticated_user_id
  )
  RETURNING * INTO created_movement;

  RETURN created_movement;
END
$$;

REVOKE ALL ON FUNCTION public.apply_inventory_movement(uuid, text, numeric, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_inventory_movement(uuid, text, numeric, text, text)
  TO authenticated, service_role;

-- Conserve la décrémentation POS existante et journalise la sortie dans la
-- même transaction. Le POS fonctionne indépendamment de l'activation du module.
CREATE OR REPLACE FUNCTION public.decrement_catalog_stock_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sale_tenant_id uuid;
  previous_stock numeric(14,3);
  resulting_stock numeric(14,3);
BEGIN
  IF NEW.service_id IS NULL THEN RETURN NEW; END IF;

  SELECT tenant_id INTO sale_tenant_id
  FROM public.ventes
  WHERE id = NEW.vente_id;

  IF sale_tenant_id IS NULL OR sale_tenant_id <> public.current_tenant_id() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Vente inaccessible';
  END IF;

  SELECT stock
  INTO previous_stock
  FROM public.services
  WHERE id = NEW.service_id
    AND tenant_id = sale_tenant_id
    AND type = 'product'
    AND manage_stock
  FOR UPDATE;

  IF NOT FOUND THEN RETURN NEW; END IF;
  IF previous_stock < NEW.qty THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Stock insuffisant pour cet article';
  END IF;

  resulting_stock := previous_stock - NEW.qty;
  UPDATE public.services
  SET stock = resulting_stock
  WHERE id = NEW.service_id;

  INSERT INTO public.inventory_movements (
    tenant_id, service_id, movement_type, quantity, quantity_delta,
    stock_before, stock_after, reason, source, user_id
  )
  VALUES (
    sale_tenant_id,
    NEW.service_id,
    'exit',
    NEW.qty,
    -NEW.qty,
    previous_stock,
    resulting_stock,
    'Vente POS',
    'pos',
    auth.uid()
  );

  RETURN NEW;
END
$$;
