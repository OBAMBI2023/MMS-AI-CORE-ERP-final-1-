-- Server-side COUNT + SUM for the Dépenses summary bar (src/routes/depenses.tsx), so a
-- tenant with tens of thousands of expenses never has the browser fetch every row (or even
-- every `amount` value) just to render "N dépenses • Total : X FCFA". A single aggregate
-- query replaces that.
--
-- SECURITY INVOKER (default) + no explicit tenant_id parameter: tenant scoping comes from
-- current_tenant_id() exactly like the existing depenses_select RLS policy
-- (tenant_id = current_tenant_id()), so this function can never be asked to summarize
-- another tenant's data — there is no tenant_id input to spoof.
--
-- The search pattern mirrors the client's escapeIlike() (src/hooks/use-paginated-table.ts)
-- and the same two search fields (category, description) used by the on-screen table, so the
-- count/total shown here can never diverge from what the filtered list itself matches.
CREATE OR REPLACE FUNCTION public.depenses_summary(p_search text DEFAULT NULL)
RETURNS TABLE (count bigint, total numeric)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  v_search text := btrim(coalesce(p_search, ''));
  v_pattern text;
BEGIN
  IF v_search = '' THEN
    v_pattern := NULL;
  ELSE
    v_pattern := '%' || replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  END IF;

  RETURN QUERY
  SELECT count(*), coalesce(sum(d.amount), 0)
  FROM public.depenses d
  WHERE d.tenant_id = current_tenant_id()
    AND (
      v_pattern IS NULL
      OR d.category ILIKE v_pattern ESCAPE '\'
      OR d.description ILIKE v_pattern ESCAPE '\'
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.depenses_summary(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.depenses_summary(text) TO authenticated;
;
