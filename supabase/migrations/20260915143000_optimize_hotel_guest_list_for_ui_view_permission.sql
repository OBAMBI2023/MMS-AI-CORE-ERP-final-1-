-- P1 (scoped): public.hotel_guest_list_for_ui() still re-evaluates
-- public.hotel_permission_for(g.tenant_id, 'hotel_guests', 'hotel.guests.view')
-- once PER ROW inside the WHERE clause (confirmed via EXPLAIN VERBOSE: it
-- shows as a per-row `Filter`, called once for every row surviving the
-- tenant_id index condition, i.e. 10 times for the 10-row Residence Damaja
-- test tenant). This is the second half of the O(N) permission-check cost
-- identified in the P0 diagnostic; the first half (identity_view) was
-- already fixed in 20260915140000_optimize_hotel_guest_list_for_ui.sql.
--
-- Read-only audit (EXPLAIN VERBOSE + generate_series-forced repeated calls,
-- no data created) confirmed:
--   - hotel_tenant_id() is already evaluated once regardless of row count
--     (shown as an Index Cond, not a Filter) -- hoisting it separately (a
--     second CTE) measured no benefit and is explicitly NOT done here.
--   - hoisting ONLY hotel_permission_for(...,'hotel.guests.view') into a
--     MATERIALIZED CTE (same pattern already used for identity_view) was
--     the best-measured strategy: ~40 ms -> ~8 ms, ~2050 -> ~1250 buffers
--     on the WHERE clause alone, 10 -> 1 calls, with 0-line EXCEPT diff in
--     both directions against the current logic.
--
-- This migration applies exactly that hoisting, and nothing else:
--   - hotel_permission_for(), has_permission(), current_tenant_id(),
--     is_admin(), current_user_module_enabled(), tenant_has_current_access(),
--     hotel_tenant_id() are all UNCHANGED (not redefined here).
--   - No RLS policy is touched.
--   - The existing `perm` CTE (identity_view, from the previous P0 fix) is
--     preserved byte-for-byte in substance; a second CTE, `perm_view`, is
--     added for the view permission -- named differently to avoid colliding
--     with the existing `perm` CTE rather than reusing the mission's example
--     name verbatim, since the live function already has a `perm` CTE.
--   - hotel_tenant_id() is NOT hoisted into its own CTE (kept as direct
--     calls, exactly as in the live definition), per explicit instruction:
--     the read-only audit showed no benefit from hoisting it separately.
--
-- Columns, column order and return type are unchanged from the live
-- definition (captured via pg_get_functiondef immediately before this
-- migration).

CREATE OR REPLACE FUNCTION public.hotel_guest_list_for_ui()
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  first_name text,
  last_name text,
  client_type text,
  company text,
  phone text,
  email text,
  nationality text,
  address text,
  notes text,
  identity_document_path text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH perm AS MATERIALIZED (
    SELECT public.hotel_permission_for(
      public.hotel_tenant_id(),
      'hotel_guests',
      'hotel.guests.identity_view'
    ) AS can_view_identity
  ),
  perm_view AS MATERIALIZED (
    SELECT public.hotel_permission_for(
      public.hotel_tenant_id(),
      'hotel_guests',
      'hotel.guests.view'
    ) AS allowed
  )
  SELECT
    g.id,
    g.tenant_id,
    g.first_name,
    g.last_name,
    g.client_type,
    g.company,
    g.phone,
    g.email,
    g.nationality,
    g.address,
    g.notes,
    CASE
      WHEN perm.can_view_identity THEN g.identity_document_path
      ELSE NULL
    END AS identity_document_path,
    g.created_at,
    g.updated_at
  FROM public.hotel_guests g
  CROSS JOIN perm
  CROSS JOIN perm_view
  WHERE g.tenant_id = public.hotel_tenant_id()
    AND perm_view.allowed;
$$;

REVOKE ALL ON FUNCTION public.hotel_guest_list_for_ui() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hotel_guest_list_for_ui() TO authenticated, service_role;
