-- Performance fix (P0, scoped): public.hotel_guest_list_for_ui() currently
-- re-evaluates public.hotel_permission_for(g.tenant_id, 'hotel_guests',
-- 'hotel.guests.identity_view') once PER ROW inside the SELECT list's CASE,
-- even though the result is identical for every row of the same tenant (all
-- returned rows already satisfy g.tenant_id = public.hotel_tenant_id() via
-- the WHERE clause). Diagnostic (EXPLAIN ANALYZE, read-only, tenant
-- ce181db9-7015-4e32-92da-272bd307a014, 10 guests) confirmed this nested
-- permission-check chain is the dominant cost (~90-182 ms / 4050 buffer hits
-- for 10 rows, scaling linearly with row count).
--
-- This migration resolves that one permission check ONCE per RPC execution
-- (MATERIALIZED CTE, explicit so PostgreSQL cannot silently inline/re-run it
-- per row) and reuses the boolean for every row's CASE, instead of calling
-- hotel_permission_for() again for each guest.
--
-- Everything else is intentionally left untouched:
--   - hotel_permission_for(), has_permission(), current_tenant_id(),
--     is_admin(), current_user_module_enabled(), hotel_tenant_id() are not
--     modified (used as-is, same arguments, same call sites elsewhere).
--   - The WHERE clause's own hotel_tenant_id()/hotel_permission_for(...,
--     'hotel.guests.view') calls are left as they were (a separate,
--     out-of-scope optimization for a later, dedicated mission).
--   - hotel_guest_identity_for_ui() is untouched.
--   - The identity_document_path access control itself is unchanged in
--     substance: it is still gated by hotel.guests.identity_view, still
--     resolved via hotel_permission_for(), still NULL when the permission is
--     absent.
--
-- Columns, column order, and return type are identical to the live
-- definition (captured via pg_get_functiondef before this change), which
-- already differs from the original 20260812193000 migration by including
-- identity_document_path — that live addition is preserved here, not
-- reverted.

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
  WHERE g.tenant_id = public.hotel_tenant_id()
    AND public.hotel_permission_for(g.tenant_id, 'hotel_guests', 'hotel.guests.view');
$$;

REVOKE ALL ON FUNCTION public.hotel_guest_list_for_ui() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hotel_guest_list_for_ui() TO authenticated, service_role;
