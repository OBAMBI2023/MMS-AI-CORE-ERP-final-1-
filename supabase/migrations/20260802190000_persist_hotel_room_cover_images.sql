-- Additive private image persistence for HOTEL rooms.
ALTER TABLE public.hotel_rooms
  ADD COLUMN IF NOT EXISTS cover_image_path text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'hotel_rooms_cover_image_path_format'
      AND conrelid = 'public.hotel_rooms'::regclass
  ) THEN
    ALTER TABLE public.hotel_rooms
      ADD CONSTRAINT hotel_rooms_cover_image_path_format CHECK (
        cover_image_path IS NULL OR cover_image_path ~ (
          '^' || tenant_id::text || '/' || id::text || '/cover\.(jpg|jpeg|png|webp)$'
        )
      );
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hotel-room-images',
  'hotel-room-images',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "hotel room images tenant read" ON storage.objects;
CREATE POLICY "hotel room images tenant read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'hotel-room-images'
    AND (storage.foldername(name))[1] = public.hotel_tenant_id()::text
    AND storage.filename(name) ~ '^cover\.(jpg|jpeg|png|webp)$'
    AND public.hotel_permission_for(public.hotel_tenant_id(), 'hotel_rooms', 'hotel.rooms.view')
    AND EXISTS (
      SELECT 1 FROM public.hotel_rooms room
      WHERE room.id::text = (storage.foldername(name))[2]
        AND room.tenant_id = public.hotel_tenant_id()
    )
  );

DROP POLICY IF EXISTS "hotel room images tenant insert" ON storage.objects;
CREATE POLICY "hotel room images tenant insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'hotel-room-images'
    AND (storage.foldername(name))[1] = public.hotel_tenant_id()::text
    AND storage.filename(name) ~ '^cover\.(jpg|jpeg|png|webp)$'
    AND (
      public.hotel_permission_for(public.hotel_tenant_id(), 'hotel_rooms', 'hotel.rooms.create')
      OR public.hotel_permission_for(public.hotel_tenant_id(), 'hotel_rooms', 'hotel.rooms.update')
    )
    AND EXISTS (
      SELECT 1 FROM public.hotel_rooms room
      WHERE room.id::text = (storage.foldername(name))[2]
        AND room.tenant_id = public.hotel_tenant_id()
    )
  );

DROP POLICY IF EXISTS "hotel room images tenant update" ON storage.objects;
CREATE POLICY "hotel room images tenant update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'hotel-room-images'
    AND (storage.foldername(name))[1] = public.hotel_tenant_id()::text
    AND storage.filename(name) ~ '^cover\.(jpg|jpeg|png|webp)$'
    AND public.hotel_permission_for(public.hotel_tenant_id(), 'hotel_rooms', 'hotel.rooms.update')
  )
  WITH CHECK (
    bucket_id = 'hotel-room-images'
    AND (storage.foldername(name))[1] = public.hotel_tenant_id()::text
    AND storage.filename(name) ~ '^cover\.(jpg|jpeg|png|webp)$'
    AND public.hotel_permission_for(public.hotel_tenant_id(), 'hotel_rooms', 'hotel.rooms.update')
    AND EXISTS (
      SELECT 1 FROM public.hotel_rooms room
      WHERE room.id::text = (storage.foldername(name))[2]
        AND room.tenant_id = public.hotel_tenant_id()
    )
  );

DROP POLICY IF EXISTS "hotel room images tenant delete" ON storage.objects;
CREATE POLICY "hotel room images tenant delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'hotel-room-images'
    AND (storage.foldername(name))[1] = public.hotel_tenant_id()::text
    AND (
      public.hotel_permission_for(public.hotel_tenant_id(), 'hotel_rooms', 'hotel.rooms.update')
      OR public.hotel_permission_for(public.hotel_tenant_id(), 'hotel_rooms', 'hotel.rooms.delete')
    )
  );

COMMENT ON COLUMN public.hotel_rooms.cover_image_path IS
  'Private Supabase Storage path in the hotel-room-images bucket.';
