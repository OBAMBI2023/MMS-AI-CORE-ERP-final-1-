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
  GROUP BY vi.item_type;
$$;

REVOKE ALL ON FUNCTION public.get_ventes_catalog_breakdown() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ventes_catalog_breakdown() TO authenticated;

DROP POLICY IF EXISTS hotel_expenses_select ON public.depenses;
;
