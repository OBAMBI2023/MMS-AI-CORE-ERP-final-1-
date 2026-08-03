CREATE TABLE public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, tenant_id)
);

CREATE UNIQUE INDEX expense_categories_tenant_name_key
  ON public.expense_categories (tenant_id, lower(btrim(name)));

ALTER TABLE public.depenses ADD COLUMN category_id uuid NULL;
ALTER TABLE public.depenses
  ADD CONSTRAINT depenses_category_id_tenant_id_fkey
  FOREIGN KEY (category_id, tenant_id)
  REFERENCES public.expense_categories(id, tenant_id)
  ON UPDATE CASCADE ON DELETE RESTRICT;
CREATE INDEX idx_depenses_tenant_category
  ON public.depenses (tenant_id, category_id) WHERE category_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.normalize_expense_category()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.name := btrim(regexp_replace(NEW.name, '\s+', ' ', 'g'));
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER normalize_expense_category
  BEFORE INSERT OR UPDATE OF name ON public.expense_categories
  FOR EACH ROW EXECUTE FUNCTION public.normalize_expense_category();

CREATE OR REPLACE FUNCTION public.sync_expense_category_name()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE public.depenses
       SET category = NEW.name
     WHERE tenant_id = NEW.tenant_id AND category_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_expense_category_name
  AFTER UPDATE OF name ON public.expense_categories
  FOR EACH ROW EXECUTE FUNCTION public.sync_expense_category_name();

CREATE OR REPLACE FUNCTION public.set_expense_category_name()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE selected_name text;
BEGIN
  IF NEW.category_id IS NOT NULL THEN
    SELECT name INTO selected_name FROM public.expense_categories
     WHERE id = NEW.category_id AND tenant_id = NEW.tenant_id;
    IF selected_name IS NULL THEN RAISE EXCEPTION 'Catégorie de dépense inaccessible'; END IF;
    NEW.category := selected_name;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_expense_category_name
  BEFORE INSERT OR UPDATE OF category_id, tenant_id ON public.depenses
  FOR EACH ROW EXECUTE FUNCTION public.set_expense_category_name();

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY expense_categories_select ON public.expense_categories FOR SELECT TO authenticated USING (
  (tenant_id = public.current_tenant_id() AND NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.platform_type = 'HOTEL'))
  OR public.hotel_permission_for(tenant_id, 'expenses', 'hotel.expenses.view')
);
CREATE POLICY expense_categories_insert ON public.expense_categories FOR INSERT TO authenticated WITH CHECK (
  (tenant_id = public.current_tenant_id() AND NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.platform_type = 'HOTEL'))
  OR public.hotel_permission_for(tenant_id, 'expenses', 'hotel.expenses.create')
);
CREATE POLICY expense_categories_update ON public.expense_categories FOR UPDATE TO authenticated USING (
  (tenant_id = public.current_tenant_id() AND NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.platform_type = 'HOTEL'))
  OR public.hotel_permission_for(tenant_id, 'expenses', 'hotel.expenses.update')
) WITH CHECK (
  (tenant_id = public.current_tenant_id() AND NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.platform_type = 'HOTEL'))
  OR public.hotel_permission_for(tenant_id, 'expenses', 'hotel.expenses.update')
);
CREATE POLICY expense_categories_delete ON public.expense_categories FOR DELETE TO authenticated USING (
  (tenant_id = public.current_tenant_id() AND NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.platform_type = 'HOTEL'))
  OR public.hotel_permission_for(tenant_id, 'expenses', 'hotel.expenses.delete')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
REVOKE ALL ON FUNCTION public.normalize_expense_category() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_expense_category_name() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_expense_category_name() FROM PUBLIC, anon, authenticated;
