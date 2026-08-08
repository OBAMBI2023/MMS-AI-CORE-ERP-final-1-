-- Performance optimizations identified by the SMALL volumetric stress test on
-- tenant 8dd8375b-0d60-4835-bbe5-bd1fbda8d932. Additive-only; no RLS disabled,
-- no permission widened. Every change here is either (a) a net-new function
-- that respects the caller's existing RLS/permissions (SECURITY INVOKER, not
-- DEFINER), or (b) removal of a single provably-redundant RLS policy.

-- ============================================================
-- 1. Dashboard N+1 fix: server-side aggregate instead of shipping every
--    vente_items row to the browser for a client-side reduce.
-- ============================================================
-- Mirrors typedRevenue()/typedQuantity() in src/hooks/use-dashboard-data.ts
-- exactly: for each item_type, sum(line_total * (vente.total/vente.subtotal))
-- and sum(qty). SECURITY INVOKER (default) — runs with the caller's own
-- privileges, so the existing vente_items/ventes RLS policies apply exactly
-- as if the caller had queried the tables directly. No new access is granted.
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

-- ============================================================
-- 2. Dépenses: drop a provably redundant RLS policy
-- ============================================================
-- "depenses_select" (USING tenant_id = current_tenant_id()) already grants
-- every tenant member unconditional SELECT on their tenant's depenses rows.
-- "hotel_expenses_select" ORs in an extra branch gated by
-- hotel_permission_for(tenant_id, 'expenses', 'hotel.expenses.view'), which
-- internally requires has_permission() -> current_tenant_id() IS NOT NULL and
-- target_tenant = hotel_tenant_id() (same profile, so equal to
-- current_tenant_id() whenever both are non-null). Every row that branch
-- could ever match therefore already satisfies current_tenant_id() =
-- tenant_id, which "depenses_select" already grants unconditionally.
-- Empirically verified against tenant ce181db9-7015-4e32-92da-272bd307a014
-- (a real HOTEL-platform tenant with depenses rows): the only role holding
-- 'hotel.expenses.view' there is Administrateur, whose access is already
-- unconditionally covered by "depenses_select". Dropping this policy changes
-- zero visible rows for any user in any tenant; it only removes the
-- per-row cost of evaluating hotel_permission_for()'s nested
-- tenants/profiles RLS lookups on every depenses scan (measured ~400ms for
-- 2000 rows vs <2ms for comparable tables).
--
-- Reversible: to restore, re-run the original definition from
-- supabase/migrations/20260803040000_assign_hotel_expenses_to_rooms.sql
-- (or wherever it was last defined) —
--   CREATE POLICY hotel_expenses_select ON public.depenses FOR SELECT
--     TO authenticated
--     USING (
--       ((tenant_id = current_tenant_id()) AND (NOT (EXISTS (
--         SELECT 1 FROM public.tenants t
--         WHERE t.id = depenses.tenant_id AND t.platform_type = 'HOTEL'
--       ))))
--       OR hotel_permission_for(tenant_id, 'expenses', 'hotel.expenses.view')
--     );
DROP POLICY IF EXISTS hotel_expenses_select ON public.depenses;
