-- Server-side COUNT + SUM for the Achats and Devis summary bars, mirroring
-- depenses_summary(): SECURITY INVOKER, tenant scoping from current_tenant_id()
-- (no client-supplied tenant_id), search pattern matches escapeIlike() and the
-- exact searchFields already used by each page's usePaginatedTable call
-- (achats: number/fournisseur_name, devis: number/client_name), so the totals
-- can never diverge from what the filtered list itself shows. Neither page
-- has any other server-side filter (status/date) today, so p_search is the
-- only input needed for correctness.

CREATE OR REPLACE FUNCTION public.achats_summary(p_search text DEFAULT NULL)
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
  SELECT count(*), coalesce(sum(a.total), 0)
  FROM public.achats a
  WHERE a.tenant_id = current_tenant_id()
    AND (
      v_pattern IS NULL
      OR a.number ILIKE v_pattern ESCAPE '\'
      OR a.fournisseur_name ILIKE v_pattern ESCAPE '\'
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.achats_summary(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.achats_summary(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.devis_summary(p_search text DEFAULT NULL)
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
  SELECT count(*), coalesce(sum(d.total), 0)
  FROM public.devis d
  WHERE d.tenant_id = current_tenant_id()
    AND (
      v_pattern IS NULL
      OR d.number ILIKE v_pattern ESCAPE '\'
      OR d.client_name ILIKE v_pattern ESCAPE '\'
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.devis_summary(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.devis_summary(text) TO authenticated;
;
