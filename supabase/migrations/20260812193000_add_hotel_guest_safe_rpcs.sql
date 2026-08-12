-- Secure HOTEL guest read models.
-- Keep row-level security and tenant isolation in place, but expose
-- separate RPCs for:
--   - safe guest listing for users with hotel.guests.view
--   - identity details for users with hotel.guests.identity_view

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
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    g.created_at,
    g.updated_at
  FROM public.hotel_guests g
  WHERE g.tenant_id = public.hotel_tenant_id()
    AND public.hotel_permission_for(g.tenant_id, 'hotel_guests', 'hotel.guests.view');
$$;

REVOKE ALL ON FUNCTION public.hotel_guest_list_for_ui() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hotel_guest_list_for_ui() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.hotel_guest_identity_for_ui(p_guest_id uuid)
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
  identity_type text,
  identity_number text,
  identity_document_path text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    g.identity_type,
    g.identity_number,
    g.identity_document_path,
    g.created_at,
    g.updated_at
  FROM public.hotel_guests g
  WHERE g.id = p_guest_id
    AND g.tenant_id = public.hotel_tenant_id()
    AND public.hotel_permission_for(g.tenant_id, 'hotel_guests', 'hotel.guests.view')
    AND public.hotel_permission_for(g.tenant_id, 'hotel_guests', 'hotel.guests.identity_view');
$$;

REVOKE ALL ON FUNCTION public.hotel_guest_identity_for_ui(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hotel_guest_identity_for_ui(uuid) TO authenticated, service_role;
