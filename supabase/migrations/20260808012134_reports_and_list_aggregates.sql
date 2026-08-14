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
;
