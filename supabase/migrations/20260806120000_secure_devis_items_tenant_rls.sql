-- devis_items_insert requires tenant_id = current_tenant_id() (see
-- 20260726160000_tenant_isolate_dashboard_data.sql / the devis_items_* policies),
-- but nothing ever populated devis_items.tenant_id: the client (LineItemsDialog)
-- only sends devis_id for line items, so every insert left tenant_id NULL and
-- was rejected with 42501 "new row violates row-level security policy for
-- table devis_items". achat_items hit the exact same gap and was fixed in
-- 20260801200000_secure_achat_items_tenant_rls.sql by deriving tenant_id from
-- the parent row inside a SECURITY DEFINER trigger instead of trusting the
-- client. Mirror that fix here rather than relaxing the RLS policy.

CREATE OR REPLACE FUNCTION public.set_devis_item_parent_tenant()
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

  SELECT quote.tenant_id
    INTO parent_tenant_id
  FROM public.devis AS quote
  WHERE quote.id = NEW.devis_id;

  IF parent_tenant_id IS NULL
     OR caller_tenant_id IS NULL
     OR parent_tenant_id IS DISTINCT FROM caller_tenant_id THEN
    RAISE EXCEPTION 'devis parent inaccessible pour le tenant courant'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.tenant_id IS NOT NULL
     AND NEW.tenant_id IS DISTINCT FROM parent_tenant_id THEN
    RAISE EXCEPTION 'tenant_id de la ligne différent de celui du devis parent'
      USING ERRCODE = '42501';
  END IF;

  NEW.tenant_id := parent_tenant_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_devis_item_parent_tenant() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_devis_items_parent_tenant ON public.devis_items;
CREATE TRIGGER trg_devis_items_parent_tenant
  BEFORE INSERT OR UPDATE OF devis_id, tenant_id ON public.devis_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_devis_item_parent_tenant();

-- Backfill existing rows left with a NULL tenant_id by the bug above so
-- historical devis keep their line items visible under the tenant policies.
UPDATE public.devis_items item
SET tenant_id = quote.tenant_id
FROM public.devis quote
WHERE quote.id = item.devis_id
  AND item.tenant_id IS NULL
  AND quote.tenant_id IS NOT NULL;
