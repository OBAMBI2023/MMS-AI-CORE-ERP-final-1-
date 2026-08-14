-- Discovered via real browser + PostgREST testing (bypassed by direct-SQL-as-postgres
-- testing, which skips RLS entirely): searching via get_ventes_keyset_page() through
-- PostgREST/RLS timed out (57014 canceling statement due to statement timeout). Root
-- cause: same issue already identified earlier this session for
-- get_ventes_catalog_breakdown() — a bare `tenant_id = current_tenant_id()` comparison
-- can get re-evaluated per row instead of once, and RLS's own policy qual on ventes
-- ANDs in a second current_tenant_id() call per row, compounding it under a forced
-- Seq Scan (ILIKE search has no usable index). Wrapping the call in a scalar subquery
-- forces single evaluation (verified ~17x faster elsewhere this session for the same
-- pattern). No change to the pagination model, signature, or search/filter semantics.
CREATE OR REPLACE FUNCTION public.get_ventes_keyset_page(
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL,
  p_limit int DEFAULT 10,
  p_search text DEFAULT NULL,
  p_payment_methods text[] DEFAULT NULL
)
RETURNS SETOF public.ventes
LANGUAGE sql
STABLE
AS $$
  SELECT v.*
  FROM public.ventes v
  WHERE v.tenant_id = (SELECT public.current_tenant_id())
    AND (p_payment_methods IS NULL OR array_length(p_payment_methods, 1) IS NULL OR v.payment_method = ANY(p_payment_methods))
    AND (
      p_search IS NULL OR p_search = ''
      OR v.number ILIKE ('%' || p_search || '%')
      OR v.client_name ILIKE ('%' || p_search || '%')
    )
    AND (
      p_cursor_created_at IS NULL
      OR v.created_at < p_cursor_created_at
      OR (v.created_at = p_cursor_created_at AND v.id < p_cursor_id)
    )
  ORDER BY v.created_at DESC, v.id DESC
  LIMIT p_limit;
$$;
REVOKE ALL ON FUNCTION public.get_ventes_keyset_page(timestamptz, uuid, int, text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ventes_keyset_page(timestamptz, uuid, int, text, text[]) TO authenticated;;
