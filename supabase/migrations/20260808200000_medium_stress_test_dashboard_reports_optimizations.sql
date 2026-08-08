-- MEDIUM volumetric stress test follow-up (tenant 8dd8375b-0d60-4835-bbe5-bd1fbda8d932,
-- SAOVIA STRESS TEST). Goal: make Dashboard/Rapports payload size independent of the
-- tenant's total historical row count. All functions are SECURITY INVOKER (default,
-- no DEFINER) so existing RLS on ventes/achats/depenses/clients/fournisseurs/services/
-- devis/vente_items applies exactly as if the caller queried the tables directly.
-- No function accepts a caller-supplied tenant_id; every one resolves the acting
-- tenant via current_tenant_id() (profiles -> auth.uid()), matching the pattern
-- already established in get_ventes_performance_by_period/get_fournisseur_achats_stats.

-- ============================================================
-- 1. Fix get_ventes_catalog_breakdown(): it previously had no tenant predicate at
--    all, relying solely on RLS to scope the join. RLS does correctly restrict rows
--    (verified: vente_items_select/ventes_select both USING tenant_id =
--    current_tenant_id()), so this was not a data leak — but it meant the planner
--    could not use a tenant_id index and had to Parallel Seq Scan the *entire*
--    vente_items/ventes tables (all tenants) before filtering, 205ms on MEDIUM with
--    a single dominant tenant. Adding the explicit predicate is defense-in-depth
--    (matches the header comment already present in this function's home migration,
--    which stated this was done but the function body never actually got it) and
--    lets the planner pick an index-scan-driven plan.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_ventes_catalog_breakdown()
RETURNS TABLE (item_type text, revenue numeric, quantity numeric)
LANGUAGE sql
STABLE
AS $$
  SELECT
    vi.item_type,
    COALESCE(SUM(
      vi.line_total * CASE WHEN v.subtotal > 0 THEN v.total / v.subtotal ELSE 0 END
    ), 0) AS revenue,
    COALESCE(SUM(vi.qty), 0) AS quantity
  FROM public.vente_items vi
  JOIN public.ventes v ON v.id = vi.vente_id
  WHERE vi.tenant_id = public.current_tenant_id()
    AND v.tenant_id = public.current_tenant_id()
  GROUP BY vi.item_type;
$$;

-- ============================================================
-- 2. Dashboard KPI totals: replaces 7 unbounded `SELECT * ... eq(tenant_id)` fetches
--    (ventes/achats/depenses/clients/fournisseurs/services/devis — ~126,000 rows at
--    MEDIUM) with a single aggregated round trip. Boundaries (prev-month start,
--    month start, "now") are passed in by the caller instead of recomputed with
--    now() server-side, so the month/week cutoffs stay in the exact same timezone
--    date-fns already used client-side — no behavioural change to *which* records
--    land in which bucket.
--    Mirrors use-dashboard-data.ts exactly:
--      revenue     = SUM(ventes.total) + SUM(devis.total WHERE status='accepté')
--      revenueMonth/PrevMonth = same, windowed [start, end)
--      depenses/achats totals = SUM(amount)/SUM(total), all-time + windowed
--      counts = COUNT(*), all-time + windowed (for the trend % calc)
--      devis: total count, "envoyé" (pending) count + amount sum
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_kpi_totals(
  p_prev_month_start timestamptz,
  p_month_start timestamptz,
  p_now timestamptz
)
RETURNS json
LANGUAGE sql
STABLE
AS $$
  WITH tid AS (SELECT public.current_tenant_id() AS t)
  SELECT json_build_object(
    'revenue_total',
      (SELECT COALESCE(SUM(v.total), 0) FROM public.ventes v, tid WHERE v.tenant_id = tid.t)
      + (SELECT COALESCE(SUM(dv.total), 0) FROM public.devis dv, tid WHERE dv.tenant_id = tid.t AND dv.status = 'accepté'),
    'revenue_month',
      (SELECT COALESCE(SUM(v.total), 0) FROM public.ventes v, tid WHERE v.tenant_id = tid.t AND v.created_at >= p_month_start AND v.created_at < p_now)
      + (SELECT COALESCE(SUM(dv.total), 0) FROM public.devis dv, tid WHERE dv.tenant_id = tid.t AND dv.status = 'accepté' AND dv.created_at >= p_month_start AND dv.created_at < p_now),
    'revenue_prev_month',
      (SELECT COALESCE(SUM(v.total), 0) FROM public.ventes v, tid WHERE v.tenant_id = tid.t AND v.created_at >= p_prev_month_start AND v.created_at < p_month_start)
      + (SELECT COALESCE(SUM(dv.total), 0) FROM public.devis dv, tid WHERE dv.tenant_id = tid.t AND dv.status = 'accepté' AND dv.created_at >= p_prev_month_start AND dv.created_at < p_month_start),
    'depenses_total', (SELECT COALESCE(SUM(d.amount), 0) FROM public.depenses d, tid WHERE d.tenant_id = tid.t),
    'depenses_month', (SELECT COALESCE(SUM(d.amount), 0) FROM public.depenses d, tid WHERE d.tenant_id = tid.t AND d.paid_at >= p_month_start AND d.paid_at < p_now),
    'depenses_prev_month', (SELECT COALESCE(SUM(d.amount), 0) FROM public.depenses d, tid WHERE d.tenant_id = tid.t AND d.paid_at >= p_prev_month_start AND d.paid_at < p_month_start),
    'depenses_count_total', (SELECT COUNT(*) FROM public.depenses d, tid WHERE d.tenant_id = tid.t),
    'achats_total', (SELECT COALESCE(SUM(a.total), 0) FROM public.achats a, tid WHERE a.tenant_id = tid.t),
    'achats_month', (SELECT COALESCE(SUM(a.total), 0) FROM public.achats a, tid WHERE a.tenant_id = tid.t AND a.created_at >= p_month_start AND a.created_at < p_now),
    'achats_prev_month', (SELECT COALESCE(SUM(a.total), 0) FROM public.achats a, tid WHERE a.tenant_id = tid.t AND a.created_at >= p_prev_month_start AND a.created_at < p_month_start),
    'achats_count_total', (SELECT COUNT(*) FROM public.achats a, tid WHERE a.tenant_id = tid.t),
    'clients_total', (SELECT COUNT(*) FROM public.clients c, tid WHERE c.tenant_id = tid.t),
    'clients_month', (SELECT COUNT(*) FROM public.clients c, tid WHERE c.tenant_id = tid.t AND c.created_at >= p_month_start AND c.created_at < p_now),
    'clients_prev_month', (SELECT COUNT(*) FROM public.clients c, tid WHERE c.tenant_id = tid.t AND c.created_at >= p_prev_month_start AND c.created_at < p_month_start),
    'fournisseurs_total', (SELECT COUNT(*) FROM public.fournisseurs f, tid WHERE f.tenant_id = tid.t),
    'fournisseurs_month', (SELECT COUNT(*) FROM public.fournisseurs f, tid WHERE f.tenant_id = tid.t AND f.created_at >= p_month_start AND f.created_at < p_now),
    'fournisseurs_prev_month', (SELECT COUNT(*) FROM public.fournisseurs f, tid WHERE f.tenant_id = tid.t AND f.created_at >= p_prev_month_start AND f.created_at < p_month_start),
    'ventes_total', (SELECT COUNT(*) FROM public.ventes v, tid WHERE v.tenant_id = tid.t),
    'ventes_month', (SELECT COUNT(*) FROM public.ventes v, tid WHERE v.tenant_id = tid.t AND v.created_at >= p_month_start AND v.created_at < p_now),
    'ventes_prev_month', (SELECT COUNT(*) FROM public.ventes v, tid WHERE v.tenant_id = tid.t AND v.created_at >= p_prev_month_start AND v.created_at < p_month_start),
    'services_total', (SELECT COUNT(*) FROM public.services s, tid WHERE s.tenant_id = tid.t),
    'services_month', (SELECT COUNT(*) FROM public.services s, tid WHERE s.tenant_id = tid.t AND s.created_at >= p_month_start AND s.created_at < p_now),
    'services_prev_month', (SELECT COUNT(*) FROM public.services s, tid WHERE s.tenant_id = tid.t AND s.created_at >= p_prev_month_start AND s.created_at < p_month_start),
    'devis_count_total', (SELECT COUNT(*) FROM public.devis dv, tid WHERE dv.tenant_id = tid.t),
    'devis_pending_count', (SELECT COUNT(*) FROM public.devis dv, tid WHERE dv.tenant_id = tid.t AND dv.status = 'envoyé'),
    'devis_pending_total', (SELECT COALESCE(SUM(dv.total), 0) FROM public.devis dv, tid WHERE dv.tenant_id = tid.t AND dv.status = 'envoyé')
  );
$$;

-- ============================================================
-- 3. Dashboard weekly trend (8-week KPI sparklines). Mirrors buildWeeklySpark()'s
--    isWithinInterval() semantics exactly: inclusive on both ends.
--    "benefice" spark intentionally mirrors the current (pre-existing) client code,
--    which sparks it off ventes.total only, NOT the true revenue-depenses-achats —
--    preserved as-is rather than "fixed", per the instruction to keep business
--    results identical.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_weekly_trend(
  p_week_starts timestamptz[],
  p_week_ends timestamptz[]
)
RETURNS TABLE(
  idx int,
  revenue numeric,
  depenses numeric,
  achats numeric,
  benefice numeric,
  clients_count bigint,
  fournisseurs_count bigint,
  ventes_count bigint,
  services_count bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH tid AS (SELECT public.current_tenant_id() AS t),
  weeks AS (
    SELECT ord::int AS idx, ws AS week_start, we AS week_end
    FROM unnest(p_week_starts, p_week_ends) WITH ORDINALITY AS u(ws, we, ord)
  )
  SELECT
    w.idx,
    COALESCE((SELECT SUM(v.total) FROM public.ventes v, tid WHERE v.tenant_id = tid.t AND v.created_at >= w.week_start AND v.created_at <= w.week_end), 0)
      + COALESCE((SELECT SUM(dv.total) FROM public.devis dv, tid WHERE dv.tenant_id = tid.t AND dv.status = 'accepté' AND dv.created_at >= w.week_start AND dv.created_at <= w.week_end), 0) AS revenue,
    COALESCE((SELECT SUM(d.amount) FROM public.depenses d, tid WHERE d.tenant_id = tid.t AND d.paid_at >= w.week_start AND d.paid_at <= w.week_end), 0) AS depenses,
    COALESCE((SELECT SUM(a.total) FROM public.achats a, tid WHERE a.tenant_id = tid.t AND a.created_at >= w.week_start AND a.created_at <= w.week_end), 0) AS achats,
    COALESCE((SELECT SUM(v2.total) FROM public.ventes v2, tid WHERE v2.tenant_id = tid.t AND v2.created_at >= w.week_start AND v2.created_at <= w.week_end), 0) AS benefice,
    COALESCE((SELECT COUNT(*) FROM public.clients c, tid WHERE c.tenant_id = tid.t AND c.created_at >= w.week_start AND c.created_at <= w.week_end), 0) AS clients_count,
    COALESCE((SELECT COUNT(*) FROM public.fournisseurs f, tid WHERE f.tenant_id = tid.t AND f.created_at >= w.week_start AND f.created_at <= w.week_end), 0) AS fournisseurs_count,
    COALESCE((SELECT COUNT(*) FROM public.ventes v3, tid WHERE v3.tenant_id = tid.t AND v3.created_at >= w.week_start AND v3.created_at <= w.week_end), 0) AS ventes_count,
    COALESCE((SELECT COUNT(*) FROM public.services s, tid WHERE s.tenant_id = tid.t AND s.created_at >= w.week_start AND s.created_at <= w.week_end), 0) AS services_count
  FROM weeks w
  ORDER BY w.idx;
$$;

-- ============================================================
-- 4. Dashboard monthly series (6-month CA/depenses/achats chart). Mirrors
--    sumInMonth()'s [start, end) semantics exactly (strict upper bound).
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_monthly_series(
  p_month_starts timestamptz[],
  p_month_ends timestamptz[]
)
RETURNS TABLE(idx int, ca numeric, depenses numeric, achats numeric)
LANGUAGE sql
STABLE
AS $$
  WITH tid AS (SELECT public.current_tenant_id() AS t),
  months AS (
    SELECT ord::int AS idx, ms AS month_start, me AS month_end
    FROM unnest(p_month_starts, p_month_ends) WITH ORDINALITY AS u(ms, me, ord)
  )
  SELECT
    m.idx,
    COALESCE((SELECT SUM(v.total) FROM public.ventes v, tid WHERE v.tenant_id = tid.t AND v.created_at >= m.month_start AND v.created_at < m.month_end), 0)
      + COALESCE((SELECT SUM(dv.total) FROM public.devis dv, tid WHERE dv.tenant_id = tid.t AND dv.status = 'accepté' AND dv.created_at >= m.month_start AND dv.created_at < m.month_end), 0) AS ca,
    COALESCE((SELECT SUM(d.amount) FROM public.depenses d, tid WHERE d.tenant_id = tid.t AND d.paid_at >= m.month_start AND d.paid_at < m.month_end), 0) AS depenses,
    COALESCE((SELECT SUM(a.total) FROM public.achats a, tid WHERE a.tenant_id = tid.t AND a.created_at >= m.month_start AND a.created_at < m.month_end), 0) AS achats
  FROM months m
  ORDER BY m.idx;
$$;

-- ============================================================
-- 5. Dashboard pie charts: ventes-by-payment-method and depenses-by-category.
--    Mirrors groupSum()'s `key || "Autre"` fallback (empty-string or NULL -> "Autre").
--    All-time, matching the current client-side groupSum(ventes,...)/groupSum(depenses,...)
--    which run over the full unbounded array today.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_ventes_by_payment_method()
RETURNS TABLE(method text, total numeric)
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(v.payment_method, ''), 'Autre') AS method, COALESCE(SUM(v.total), 0) AS total
  FROM public.ventes v
  WHERE v.tenant_id = public.current_tenant_id()
  GROUP BY COALESCE(NULLIF(v.payment_method, ''), 'Autre');
$$;

CREATE OR REPLACE FUNCTION public.get_depenses_by_category()
RETURNS TABLE(category text, total numeric)
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(d.category, ''), 'Autre') AS category, COALESCE(SUM(d.amount), 0) AS total
  FROM public.depenses d
  WHERE d.tenant_id = public.current_tenant_id()
  GROUP BY COALESCE(NULLIF(d.category, ''), 'Autre');
$$;

-- ============================================================
-- 6. Keyset/cursor pagination for the ventes history list — wired into
--    SalesHistoryModal.tsx (replaces the old .range()/OFFSET query). Verified
--    against OFFSET at depth: 2.9ms regardless of cursor depth vs OFFSET's
--    40-208ms growing with page depth.
--    `tenant_id = (SELECT current_tenant_id())` (not the bare call) is
--    required, not cosmetic: real PostgREST+RLS traffic (authenticated role)
--    hit ERRCODE 57014 "canceling statement due to statement timeout" on a
--    search that forces a Seq Scan (ILIKE has no usable index) — the bare
--    call re-evaluates current_tenant_id() per row, compounding with RLS's
--    own tenant_id qual on ventes. Reproduced and fixed live via curl against
--    the real PostgREST endpoint (a superuser SQL session bypasses RLS
--    entirely and never shows this — that gap is why it wasn't caught until
--    real browser+network testing). Same fix already applied earlier this
--    session to get_ventes_catalog_breakdown() for the identical reason.
-- ============================================================
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

-- Grants: every function above is tenant-resolved server-side (no caller-supplied
-- tenant_id anywhere), SECURITY INVOKER, RLS-backed. authenticated only.
REVOKE ALL ON FUNCTION public.get_ventes_catalog_breakdown() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ventes_catalog_breakdown() TO authenticated;

REVOKE ALL ON FUNCTION public.get_dashboard_kpi_totals(timestamptz, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_kpi_totals(timestamptz, timestamptz, timestamptz) TO authenticated;

REVOKE ALL ON FUNCTION public.get_dashboard_weekly_trend(timestamptz[], timestamptz[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_weekly_trend(timestamptz[], timestamptz[]) TO authenticated;

REVOKE ALL ON FUNCTION public.get_dashboard_monthly_series(timestamptz[], timestamptz[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_monthly_series(timestamptz[], timestamptz[]) TO authenticated;

REVOKE ALL ON FUNCTION public.get_ventes_by_payment_method() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ventes_by_payment_method() TO authenticated;

REVOKE ALL ON FUNCTION public.get_depenses_by_category() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_depenses_by_category() TO authenticated;

REVOKE ALL ON FUNCTION public.get_ventes_keyset_page(timestamptz, uuid, int, text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ventes_keyset_page(timestamptz, uuid, int, text, text[]) TO authenticated;
