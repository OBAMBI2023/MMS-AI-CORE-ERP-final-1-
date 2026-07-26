CREATE TABLE IF NOT EXISTS public.catalog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (btrim(name) <> ''),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS catalog_categories_tenant_name_key
  ON public.catalog_categories (tenant_id, lower(btrim(name)));
CREATE INDEX IF NOT EXISTS catalog_categories_tenant_sort_idx
  ON public.catalog_categories (tenant_id, sort_order, name);

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'service',
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.catalog_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS stock numeric(14,3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'services_type_valid'
      AND conrelid = 'public.services'::regclass
  ) THEN
    ALTER TABLE public.services
      ADD CONSTRAINT services_type_valid CHECK (type IN ('product', 'service'));
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'services_stock_nonnegative'
      AND conrelid = 'public.services'::regclass
  ) THEN
    ALTER TABLE public.services
      ADD CONSTRAINT services_stock_nonnegative CHECK (stock IS NULL OR stock >= 0);
  END IF;
END
$$;

-- The historical seed predates tenants. It belongs to Maguy Multi Services;
-- use its named tenant, with the oldest tenant only as a legacy fallback.
DO $$
DECLARE
  mms_tenant_id uuid;
BEGIN
  SELECT id INTO mms_tenant_id
  FROM public.tenants
  ORDER BY
    CASE WHEN lower(btrim(name)) = 'maguy multi services' THEN 0 ELSE 1 END,
    created_at,
    id
  LIMIT 1;

  IF EXISTS (SELECT 1 FROM public.services WHERE tenant_id IS NULL) THEN
    IF mms_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Impossible de rattacher le catalogue MMS : aucun tenant';
    END IF;
    UPDATE public.services
    SET tenant_id = mms_tenant_id
    WHERE tenant_id IS NULL;
  END IF;
END
$$;

-- Preserve referenced catalogue rows and collapse duplicate legacy services.
WITH ranked AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY tenant_id, lower(btrim(name)), type
      ORDER BY created_at, id
    ) AS keeper_id,
    row_number() OVER (
      PARTITION BY tenant_id, lower(btrim(name)), type
      ORDER BY created_at, id
    ) AS duplicate_rank
  FROM public.services
)
UPDATE public.vente_items item
SET service_id = ranked.keeper_id
FROM ranked
WHERE item.service_id = ranked.id
  AND ranked.duplicate_rank > 1;

WITH ranked AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY tenant_id, lower(btrim(name)), type
      ORDER BY created_at, id
    ) AS keeper_id,
    row_number() OVER (
      PARTITION BY tenant_id, lower(btrim(name)), type
      ORDER BY created_at, id
    ) AS duplicate_rank
  FROM public.services
)
UPDATE public.devis_items item
SET service_id = ranked.keeper_id
FROM ranked
WHERE item.service_id = ranked.id
  AND ranked.duplicate_rank > 1;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY tenant_id, lower(btrim(name)), type
      ORDER BY created_at, id
    ) AS duplicate_rank
  FROM public.services
)
DELETE FROM public.services service
USING ranked
WHERE service.id = ranked.id
  AND ranked.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS services_tenant_name_type_key
  ON public.services (tenant_id, lower(btrim(name)), type);

INSERT INTO public.catalog_categories (tenant_id, name, sort_order)
SELECT
  service.tenant_id,
  btrim(service.category),
  dense_rank() OVER (
    PARTITION BY service.tenant_id
    ORDER BY lower(btrim(service.category))
  ) * 10
FROM public.services service
WHERE service.tenant_id IS NOT NULL
  AND btrim(service.category) <> ''
GROUP BY service.tenant_id, btrim(service.category)
ON CONFLICT DO NOTHING;

UPDATE public.services service
SET category_id = category.id
FROM public.catalog_categories category
WHERE category.tenant_id = service.tenant_id
  AND lower(btrim(category.name)) = lower(btrim(service.category))
  AND service.category_id IS NULL;

CREATE INDEX IF NOT EXISTS services_tenant_category_idx
  ON public.services (tenant_id, category_id);
CREATE INDEX IF NOT EXISTS services_tenant_type_active_idx
  ON public.services (tenant_id, type, active);

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
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Tenant authentifié requis';
  END IF;

  -- Never trust or accept a tenant selected by the client.
  NEW.tenant_id := authenticated_tenant_id;

  IF TG_TABLE_NAME = 'services' AND NEW.category_id IS NOT NULL THEN
    SELECT name INTO selected_category_name
    FROM public.catalog_categories
    WHERE id = NEW.category_id
      AND tenant_id = authenticated_tenant_id;
    IF selected_category_name IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Catégorie inaccessible';
    END IF;
    NEW.category := selected_category_name;
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_catalog_categories_set_tenant ON public.catalog_categories;
CREATE TRIGGER trg_catalog_categories_set_tenant
  BEFORE INSERT OR UPDATE ON public.catalog_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_catalog_tenant();

DROP TRIGGER IF EXISTS trg_services_set_catalog_tenant ON public.services;
CREATE TRIGGER trg_services_set_catalog_tenant
  BEFORE INSERT OR UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_catalog_tenant();

ALTER TABLE public.services ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.catalog_categories ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.catalog_categories FROM anon;
REVOKE ALL ON TABLE public.services FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON TABLE public.catalog_categories TO service_role;

DROP POLICY IF EXISTS "catalog_categories_tenant_isolation" ON public.catalog_categories;
CREATE POLICY "catalog_categories_tenant_isolation"
  ON public.catalog_categories
  FOR ALL
  TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "tenant isolation services" ON public.services;
CREATE POLICY "tenant isolation services"
  ON public.services
  FOR ALL
  TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

REVOKE ALL ON FUNCTION public.set_catalog_tenant() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_catalog_tenant() TO service_role;
