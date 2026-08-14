-- Fix: the previous apply of get_dashboard_monthly_series accidentally used
-- depenses.created_at instead of depenses.paid_at for the "depenses" bucket,
-- inconsistent with get_dashboard_kpi_totals/get_dashboard_weekly_trend which
-- both correctly use paid_at. No other logic changed.
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
      + COALESCE((SELECT SUM(dp.amount) FROM public.devis_payments dp, tid WHERE dp.tenant_id = tid.t AND dp.paid_at >= m.month_start AND dp.paid_at < m.month_end), 0) AS ca,
    COALESCE((SELECT SUM(d.amount) FROM public.depenses d, tid WHERE d.tenant_id = tid.t AND d.paid_at >= m.month_start AND d.paid_at < m.month_end), 0) AS depenses,
    COALESCE((SELECT SUM(a.total) FROM public.achats a, tid WHERE a.tenant_id = tid.t AND a.created_at >= m.month_start AND a.created_at < m.month_end), 0) AS achats
  FROM months m
  ORDER BY m.idx;
$$;
;
