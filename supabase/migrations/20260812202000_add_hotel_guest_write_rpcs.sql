-- Tenant-safe HOTEL guest write RPCs.
-- Keep RLS enabled; write access goes through SECURITY DEFINER functions that
-- resolve the tenant from public.hotel_tenant_id() and enforce hotel RBAC.

CREATE OR REPLACE FUNCTION public.hotel_guest_update_for_ui(
  p_guest_id uuid,
  p_first_name text,
  p_last_name text,
  p_client_type text,
  p_company text,
  p_phone text,
  p_email text,
  p_nationality text,
  p_address text,
  p_notes text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_tenant uuid := public.hotel_tenant_id();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentification requise';
  END IF;

  IF current_tenant IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Etablissement introuvable';
  END IF;

  IF NOT public.hotel_permission_for(current_tenant, 'hotel_guests', 'hotel.guests.update') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Permission de modification requise';
  END IF;

  UPDATE public.hotel_guests g
     SET first_name = p_first_name,
         last_name = p_last_name,
         client_type = p_client_type,
         company = p_company,
         phone = p_phone,
         email = p_email,
         nationality = p_nationality,
         address = p_address,
         notes = p_notes
   WHERE g.id = p_guest_id
     AND g.tenant_id = current_tenant;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.hotel_guest_update_for_ui(uuid, text, text, text, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hotel_guest_update_for_ui(uuid, text, text, text, text, text, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.hotel_guest_delete_for_ui(p_guest_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_tenant uuid := public.hotel_tenant_id();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentification requise';
  END IF;

  IF current_tenant IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Etablissement introuvable';
  END IF;

  IF NOT public.hotel_permission_for(current_tenant, 'hotel_guests', 'hotel.guests.delete') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Permission de suppression requise';
  END IF;

  DELETE FROM public.hotel_guests g
   WHERE g.id = p_guest_id
     AND g.tenant_id = current_tenant;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.hotel_guest_delete_for_ui(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hotel_guest_delete_for_ui(uuid) TO authenticated;
