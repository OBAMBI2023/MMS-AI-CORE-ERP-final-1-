alter table public.hotel_rooms
  add column if not exists property_type text,
  add column if not exists room_count integer;

alter table public.hotel_rooms
  add constraint hotel_rooms_property_type_check
    check (property_type is null or property_type = any (array['studio','chambre','appartement','suite','villa','maison','autre']));

alter table public.hotel_rooms
  add constraint hotel_rooms_room_count_check
    check (room_count is null or (room_count >= 1 and room_count <= 99));

comment on column public.hotel_rooms.property_type is 'Broad property category (studio, chambre, appartement, suite, villa, maison, autre) — independent from room_count and from the tenant-defined hotel_room_types catalog.';
comment on column public.hotel_rooms.room_count is 'Number of rooms/pieces in the unit. Always 1 for property_type = studio; free entry (1-99) for other types.';;
