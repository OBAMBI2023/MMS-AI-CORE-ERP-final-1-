BEGIN;
SELECT plan(8);

SELECT ok(NOT EXISTS(
 SELECT 1 FROM public.role_permissions rp JOIN public.roles r ON r.id=rp.role_id
 JOIN public.permissions p ON p.id=rp.permission_id
 WHERE r.name='Réceptionniste' AND p.code IN('hotel.guests.identity_view','hotel.guests.delete')
),'receptionists have no identity or guest deletion permission');
SELECT ok(EXISTS(
 SELECT 1 FROM public.role_permissions rp JOIN public.roles r ON r.id=rp.role_id
 JOIN public.permissions p ON p.id=rp.permission_id
 WHERE r.name='Réceptionniste' AND p.code='hotel.guests.view'
),'receptionists retain guest directory access');
SELECT ok(EXISTS(
 SELECT 1 FROM public.role_permissions rp JOIN public.roles r ON r.id=rp.role_id
 JOIN public.permissions p ON p.id=rp.permission_id
 WHERE r.name='Administrateur' AND p.code='hotel.guests.identity_view'
),'administrators retain identity permission');
SELECT ok(EXISTS(SELECT 1 FROM pg_constraint WHERE conname='hotel_room_types_id_tenant_key' AND contype='u'),'room types expose composite uniqueness');
SELECT ok(EXISTS(SELECT 1 FROM pg_constraint WHERE conname='hotel_rooms_room_type_tenant_fkey' AND contype='f' AND convalidated),'composite room type FK is validated');
SELECT is((SELECT array_agg(att.attname ORDER BY key.ordinality) FROM pg_constraint c CROSS JOIN unnest(c.conkey) WITH ORDINALITY key(attnum,ordinality) JOIN pg_attribute att ON att.attrelid=c.conrelid AND att.attnum=key.attnum WHERE c.conname='hotel_rooms_room_type_tenant_fkey'),ARRAY['room_type_id','tenant_id']::name[],'FK includes room type and tenant');
SELECT matches(pg_get_functiondef('public.create_hotel_reception_role()'::regprocedure),'hotel.guests.view','future reception role gets explicit guest view');
SELECT unlike(pg_get_functiondef('public.create_hotel_reception_role()'::regprocedure),'hotel.guests.%','future reception role uses no guest wildcard');

SELECT * FROM finish();
ROLLBACK;
