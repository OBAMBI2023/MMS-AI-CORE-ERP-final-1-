-- Split the shared category catalogue without changing tenant ownership or RLS.
ALTER TABLE public.catalog_categories
  ADD COLUMN IF NOT EXISTS type text;

-- Preserve legacy data as product categories.
ALTER TABLE public.catalog_categories
  DISABLE TRIGGER trg_catalog_categories_set_tenant;

UPDATE public.catalog_categories
SET type = 'product'
WHERE type IS NULL;

ALTER TABLE public.catalog_categories
  ENABLE TRIGGER trg_catalog_categories_set_tenant;

ALTER TABLE public.catalog_categories
  ALTER COLUMN type SET DEFAULT 'product',
  ALTER COLUMN type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'catalog_categories_type_valid'
      AND conrelid = 'public.catalog_categories'::regclass
  ) THEN
    ALTER TABLE public.catalog_categories
      ADD CONSTRAINT catalog_categories_type_valid
      CHECK (type IN ('product', 'service'));
  END IF;
END
$$;

DROP INDEX IF EXISTS public.catalog_categories_tenant_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS catalog_categories_tenant_name_type_key
  ON public.catalog_categories (tenant_id, lower(btrim(name)), type);
CREATE INDEX IF NOT EXISTS catalog_categories_tenant_type_idx
  ON public.catalog_categories (tenant_id, type);

-- Keep tenant enforcement and reject category/item type mismatches.
CREATE OR REPLACE FUNCTION public.set_catalog_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  authenticated_tenant_id uuid;
  selected_category_name text;
  selected_category_type text;
BEGIN
  authenticated_tenant_id := public.current_tenant_id();
  IF authenticated_tenant_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Tenant authentifie requis';
  END IF;

  IF NEW.category_id IS NOT NULL THEN
    SELECT name, type
    INTO selected_category_name, selected_category_type
    FROM public.catalog_categories
    WHERE id = NEW.category_id
      AND tenant_id = authenticated_tenant_id;

    IF selected_category_name IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Categorie inaccessible';
    END IF;
    IF selected_category_type IS DISTINCT FROM NEW.type THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'Le type de la categorie ne correspond pas au type de l article';
    END IF;
    NEW.category := selected_category_name;
  END IF;

  NEW.tenant_id := authenticated_tenant_id;
  RETURN NEW;
END
$$;

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
  source_type text;
  replacement_type text;
BEGIN
  IF authenticated_tenant_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Tenant authentifie requis';
  END IF;
  IF source_category_id = replacement_category_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'La categorie de remplacement doit etre differente';
  END IF;

  SELECT type INTO source_type
  FROM public.catalog_categories
  WHERE id = source_category_id
    AND tenant_id = authenticated_tenant_id;

  SELECT type INTO replacement_type
  FROM public.catalog_categories
  WHERE id = replacement_category_id
    AND tenant_id = authenticated_tenant_id
    AND active;

  IF source_type IS NULL OR replacement_type IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Categorie inaccessible';
  END IF;
  IF source_type IS DISTINCT FROM replacement_type THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Les categories doivent avoir le meme type';
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
