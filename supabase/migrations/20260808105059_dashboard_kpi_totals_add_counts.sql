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
REVOKE ALL ON FUNCTION public.get_dashboard_kpi_totals(timestamptz, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_kpi_totals(timestamptz, timestamptz, timestamptz) TO authenticated;;
