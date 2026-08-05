-- P1: keep identity access privileged and enforce tenant-scoped room types.

-- Remove sensitive grants that the former wildcard may have assigned.
DELETE FROM public.role_permissions assignment
USING public.roles role, public.permissions permission
WHERE assignment.role_id=role.id
  AND assignment.permission_id=permission.id
  AND role.name='Réceptionniste'
  AND permission.code IN('hotel.guests.identity_view','hotel.guests.delete');

-- Reception can work with the guest directory, but cannot read identity data
-- or delete guest records. Custom roles are intentionally untouched.
INSERT INTO public.role_permissions(role_id,permission_id)
SELECT role.id,permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.code IN(
  'hotel.guests.view','hotel.guests.create','hotel.guests.update'
)
WHERE role.name='Réceptionniste'
ON CONFLICT DO NOTHING;

-- Replace the future-role initializer so it never uses hotel.guests.%.
CREATE OR REPLACE FUNCTION public.create_hotel_reception_role() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE reception_role_id uuid;
BEGIN
 IF NEW.platform_type<>'HOTEL' THEN RETURN NEW; END IF;
 INSERT INTO public.roles(tenant_id,name,description)
 VALUES(NEW.id,'Réceptionniste','Réservations, voyageurs et accueil Hôtel')
 ON CONFLICT(tenant_id,name) DO UPDATE SET description=EXCLUDED.description
 RETURNING id INTO reception_role_id;

 INSERT INTO public.role_permissions(role_id,permission_id)
 SELECT reception_role_id,id FROM public.permissions
 WHERE code LIKE 'hotel.reservations.%'
    OR code='hotel.rooms.view'
    OR code IN('hotel.guests.view','hotel.guests.create','hotel.guests.update')
 ON CONFLICT DO NOTHING;

 DELETE FROM public.role_permissions assignment
 USING public.permissions permission
 WHERE assignment.role_id=reception_role_id
   AND assignment.permission_id=permission.id
   AND permission.code IN('hotel.guests.identity_view','hotel.guests.delete');
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.create_hotel_reception_role() FROM PUBLIC,anon,authenticated;

-- Composite uniqueness is required by the tenant-scoped foreign key.
ALTER TABLE public.hotel_room_types
  ADD CONSTRAINT hotel_room_types_id_tenant_key UNIQUE(id,tenant_id);

ALTER TABLE public.hotel_rooms
  DROP CONSTRAINT IF EXISTS hotel_rooms_room_type_id_fkey;
ALTER TABLE public.hotel_rooms
  ADD CONSTRAINT hotel_rooms_room_type_tenant_fkey
  FOREIGN KEY(room_type_id,tenant_id)
  REFERENCES public.hotel_room_types(id,tenant_id)
  ON DELETE SET NULL (room_type_id)
  NOT VALID;
ALTER TABLE public.hotel_rooms
  VALIDATE CONSTRAINT hotel_rooms_room_type_tenant_fkey;
