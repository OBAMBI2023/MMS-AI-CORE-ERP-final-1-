-- Private, tenant-scoped storage for hotel guest identity documents.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('hotel-identity-documents', 'hotel-identity-documents', false, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "hotel identity documents tenant read" ON storage.objects;
CREATE POLICY "hotel identity documents tenant read" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'hotel-identity-documents'
  AND (storage.foldername(name))[1] = public.hotel_tenant_id()::text
  AND (storage.foldername(name))[2] = 'identity-documents'
  AND public.hotel_permission_for(public.hotel_tenant_id(), 'hotel_guests', 'hotel.guests.identity_view')
);

DROP POLICY IF EXISTS "hotel identity documents tenant insert" ON storage.objects;
CREATE POLICY "hotel identity documents tenant insert" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'hotel-identity-documents'
  AND (storage.foldername(name))[1] = public.hotel_tenant_id()::text
  AND (storage.foldername(name))[2] = 'identity-documents'
  AND storage.filename(name) ~ '^[0-9a-f-]{36}\.(jpg|png|webp)$'
  AND public.hotel_permission_for(public.hotel_tenant_id(), 'hotel_guests', 'hotel.guests.identity_view')
);

DROP POLICY IF EXISTS "hotel identity documents tenant delete" ON storage.objects;
CREATE POLICY "hotel identity documents tenant delete" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'hotel-identity-documents'
  AND (storage.foldername(name))[1] = public.hotel_tenant_id()::text
  AND (storage.foldername(name))[2] = 'identity-documents'
  AND public.hotel_permission_for(public.hotel_tenant_id(), 'hotel_guests', 'hotel.guests.update')
);

COMMENT ON COLUMN public.hotel_guests.identity_document_path IS
  'Private path in the hotel-identity-documents bucket; access is tenant-scoped by Storage RLS.';
