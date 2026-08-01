-- achat_items inherits its tenant from the purchase header.  The client only
-- sends achat_id for line items, so the database is responsible for copying
-- and validating tenant_id before RLS evaluates the new row.

ALTER TABLE public.achat_items
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

CREATE INDEX IF NOT EXISTS idx_achat_items_tenant_id
  ON public.achat_items (tenant_id);

CREATE OR REPLACE FUNCTION public.set_achat_item_parent_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_tenant_id uuid;
  caller_tenant_id uuid;
BEGIN
  caller_tenant_id := public.current_tenant_id();

  SELECT purchase.tenant_id
    INTO parent_tenant_id
  FROM public.achats AS purchase
  WHERE purchase.id = NEW.achat_id;

  IF parent_tenant_id IS NULL
     OR caller_tenant_id IS NULL
     OR parent_tenant_id IS DISTINCT FROM caller_tenant_id THEN
    RAISE EXCEPTION 'achat parent inaccessible pour le tenant courant'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.tenant_id IS NOT NULL
     AND NEW.tenant_id IS DISTINCT FROM parent_tenant_id THEN
    RAISE EXCEPTION 'tenant_id de la ligne différent de celui de l''achat parent'
      USING ERRCODE = '42501';
  END IF;

  NEW.tenant_id := parent_tenant_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_achat_item_parent_tenant() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_achat_items_parent_tenant ON public.achat_items;
CREATE TRIGGER trg_achat_items_parent_tenant
  BEFORE INSERT OR UPDATE OF achat_id, tenant_id ON public.achat_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_achat_item_parent_tenant();

ALTER TABLE public.achat_items ENABLE ROW LEVEL SECURITY;

-- Remove every pre-existing permissive policy on this table. PostgreSQL ORs
-- permissive policies, so leaving the historical FOR ALL policy would bypass
-- the parent/tenant checks below.
DO $$
DECLARE
  policy_name text;
BEGIN
  FOR policy_name IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'achat_items'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.achat_items', policy_name);
  END LOOP;
END
$$;

CREATE POLICY achat_items_select_same_tenant
ON public.achat_items FOR SELECT TO authenticated
USING (
  tenant_id = public.current_tenant_id()
  AND EXISTS (
    SELECT 1 FROM public.achats AS purchase
    WHERE purchase.id = achat_items.achat_id
      AND purchase.tenant_id = public.current_tenant_id()
      AND purchase.tenant_id = achat_items.tenant_id
  )
);

CREATE POLICY achat_items_insert_same_tenant
ON public.achat_items FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.current_tenant_id()
  AND EXISTS (
    SELECT 1 FROM public.achats AS purchase
    WHERE purchase.id = achat_items.achat_id
      AND purchase.tenant_id = public.current_tenant_id()
      AND purchase.tenant_id = achat_items.tenant_id
  )
);

CREATE POLICY achat_items_update_same_tenant
ON public.achat_items FOR UPDATE TO authenticated
USING (
  tenant_id = public.current_tenant_id()
  AND EXISTS (
    SELECT 1 FROM public.achats AS purchase
    WHERE purchase.id = achat_items.achat_id
      AND purchase.tenant_id = public.current_tenant_id()
      AND purchase.tenant_id = achat_items.tenant_id
  )
)
WITH CHECK (
  tenant_id = public.current_tenant_id()
  AND EXISTS (
    SELECT 1 FROM public.achats AS purchase
    WHERE purchase.id = achat_items.achat_id
      AND purchase.tenant_id = public.current_tenant_id()
      AND purchase.tenant_id = achat_items.tenant_id
  )
);

CREATE POLICY achat_items_delete_same_tenant
ON public.achat_items FOR DELETE TO authenticated
USING (
  tenant_id = public.current_tenant_id()
  AND EXISTS (
    SELECT 1 FROM public.achats AS purchase
    WHERE purchase.id = achat_items.achat_id
      AND purchase.tenant_id = public.current_tenant_id()
      AND purchase.tenant_id = achat_items.tenant_id
  )
);
