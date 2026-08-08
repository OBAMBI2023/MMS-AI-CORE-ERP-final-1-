-- SMALL-volumetric follow-up: SalesHistoryModal's payment-method filter needs
-- the distinct set of payment methods used by the tenant, independent of
-- whichever page of results is currently on screen (now that the ventes list
-- itself is paginated via .range() instead of fetching the whole table).
-- SECURITY INVOKER (default) — respects the caller's existing ventes RLS.
CREATE OR REPLACE FUNCTION public.get_distinct_ventes_payment_methods()
RETURNS TABLE (payment_method text)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT v.payment_method
  FROM public.ventes v
  WHERE v.payment_method IS NOT NULL
  ORDER BY v.payment_method;
$$;

REVOKE ALL ON FUNCTION public.get_distinct_ventes_payment_methods() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_distinct_ventes_payment_methods() TO authenticated;
