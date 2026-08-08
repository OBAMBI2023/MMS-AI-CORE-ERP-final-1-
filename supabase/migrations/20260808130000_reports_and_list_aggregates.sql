-- Final pre-MEDIUM performance pass.
-- All functions below are SECURITY INVOKER (the default — no DEFINER used,
-- so no elevated-privilege review is needed): they run with the CALLER's own
-- privileges, so the existing RLS policies on ventes/vente_items/achats/
-- achat_items apply exactly as if the caller queried the tables directly.
-- Each also adds an explicit `tenant_id = current_tenant_id()` predicate
-- (redundant with RLS, but required for the query planner to choose an
-- index scan instead of re-evaluating RLS quals per row across a wider
-- scan — the exact cost pattern identified while fixing the Dashboard N+1).
-- current_tenant_id() itself derives strictly from auth.uid() -> profiles;
-- no caller-supplied tenant_id is ever accepted or trusted.

-- ============================================================
-- 1. Rapports "Meilleurs produits/services": replaces the per-vente
--    correlated subquery (975ms / 1444 ventes for "Cette année") with a
--    single indexed JOIN + GROUP BY. Formula matches
--    revenueForType()/buildPerformance() in src/routes/rapports.tsx exactly:
--    revenue = SUM(line_total * (vente.total/vente.subtotal)); cost is only
--    non-zero for products (cost_price * qty); grouped by (item_type, name)
--    exactly like the client-side Map keyed on item.name previously was.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_ventes_performance_by_period(p_start timestamptz, p_end timestamptz)
RETURNS TABLE (item_type text, item_name text, quantity numeric, revenue numeric, cost numeric)
LANGUAGE sql
STABLE
AS $$
  SELECT
    vi.item_type,
    vi.name,
    SUM(vi.qty) AS quantity,
    SUM(vi.line_total * CASE WHEN v.subtotal > 0 THEN v.total / v.subtotal ELSE 0 END) AS revenue,
    SUM(CASE WHEN vi.item_type = 'product' THEN vi.cost_price * vi.qty ELSE 0 END) AS cost
  FROM public.vente_items vi
  JOIN public.ventes v ON v.id = vi.vente_id
  WHERE vi.tenant_id = public.current_tenant_id()
    AND v.tenant_id = public.current_tenant_id()
    AND v.created_at >= p_start
    AND v.created_at <= p_end
  GROUP BY vi.item_type, vi.name;
$$;

REVOKE ALL ON FUNCTION public.get_ventes_performance_by_period(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ventes_performance_by_period(timestamptz, timestamptz) TO authenticated;

-- ============================================================
-- 2. Fournisseurs page: replaces an unfiltered `SELECT fournisseur_id,
--    created_at FROM achats` (full RLS-filtered table fetch, aggregated in
--    JS) with a server-side GROUP BY.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_fournisseur_achats_stats()
RETURNS TABLE (fournisseur_id uuid, achats_count bigint, last_achat_at timestamptz)
LANGUAGE sql
STABLE
AS $$
  SELECT a.fournisseur_id, count(*) AS achats_count, max(a.created_at) AS last_achat_at
  FROM public.achats a
  WHERE a.tenant_id = public.current_tenant_id()
    AND a.fournisseur_id IS NOT NULL
  GROUP BY a.fournisseur_id;
$$;

REVOKE ALL ON FUNCTION public.get_fournisseur_achats_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_fournisseur_achats_stats() TO authenticated;

-- ============================================================
-- 3. Achats page: replaces a full `achat_items` column fetch (grouped in
--    JS) with a server-side GROUP BY returning only the counts.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_achat_items_counts()
RETURNS TABLE (achat_id uuid, items_count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT ai.achat_id, count(*) AS items_count
  FROM public.achat_items ai
  WHERE ai.tenant_id = public.current_tenant_id()
  GROUP BY ai.achat_id;
$$;

REVOKE ALL ON FUNCTION public.get_achat_items_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_achat_items_counts() TO authenticated;
