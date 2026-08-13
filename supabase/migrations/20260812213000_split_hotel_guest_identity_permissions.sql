-- Separate HOTEL guest identity read and write permissions without changing RLS.

INSERT INTO public.permissions(code, description)
VALUES ('hotel.guests.identity_manage', 'Saisir et modifier les pièces d''identité des voyageurs')
ON CONFLICT (code) DO UPDATE
SET description = EXCLUDED.description;

-- Ensure the operational HOTEL roles keep identity write access.
INSERT INTO public.role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.tenants t ON t.id = r.tenant_id
CROSS JOIN public.permissions p
WHERE p.code = 'hotel.guests.identity_manage'
  AND t.platform_type = 'HOTEL'
  AND t.is_active
  AND t.deleted_at IS NULL
  AND r.name IN ('Administrateur', 'Gérant', 'Manager', 'Réceptionniste')
ON CONFLICT DO NOTHING;

DROP FUNCTION IF EXISTS public.hotel_guest_update_for_ui(
  uuid,
  text, text, text, text, text, text, text, text, text
);

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
  p_notes text,
  p_identity_type text DEFAULT NULL,
  p_identity_number text DEFAULT NULL,
  p_identity_document_path text DEFAULT NULL
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

  IF p_identity_type IS NOT NULL
     OR p_identity_number IS NOT NULL
     OR p_identity_document_path IS NOT NULL THEN
    IF NOT public.hotel_permission_for(current_tenant, 'hotel_guests', 'hotel.guests.identity_manage') THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Permission pièces d''identité requise';
    END IF;
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
         notes = p_notes,
         identity_type = COALESCE(p_identity_type, g.identity_type),
         identity_number = COALESCE(p_identity_number, g.identity_number),
         identity_document_path = COALESCE(p_identity_document_path, g.identity_document_path)
   WHERE g.id = p_guest_id
     AND g.tenant_id = current_tenant;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.hotel_guest_update_for_ui(uuid, text, text, text, text, text, text, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hotel_guest_update_for_ui(uuid, text, text, text, text, text, text, text, text, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_hotel_guest_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_tenant uuid := public.hotel_tenant_id();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Authentification requise';
  END IF;

  IF current_tenant IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Etablissement introuvable';
  END IF;

  IF NEW.tenant_id IS NOT NULL
     AND NEW.tenant_id IS DISTINCT FROM current_tenant THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Operation inter-tenant interdite';
  END IF;

  IF (
    TG_OP = 'INSERT'
    AND (
      NEW.identity_type IS NOT NULL
      OR NEW.identity_number IS NOT NULL
      OR NEW.identity_document_path IS NOT NULL
    )
  )
  OR (
    TG_OP = 'UPDATE'
    AND (
      NEW.identity_type IS DISTINCT FROM OLD.identity_type
      OR NEW.identity_number IS DISTINCT FROM OLD.identity_number
      OR NEW.identity_document_path IS DISTINCT FROM OLD.identity_document_path
    )
  ) THEN
    IF NOT public.hotel_permission_for(
      current_tenant,
      'hotel_guests',
      'hotel.guests.identity_manage'
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'Permission pieces d''identite requise';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_hotel_guest_identity ON public.hotel_guests;
CREATE TRIGGER protect_hotel_guest_identity BEFORE INSERT OR UPDATE OF identity_type,identity_number,identity_document_path ON public.hotel_guests
FOR EACH ROW EXECUTE FUNCTION public.protect_hotel_guest_identity();
REVOKE ALL ON FUNCTION public.protect_hotel_guest_identity() FROM PUBLIC,anon,authenticated;
