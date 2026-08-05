-- Minimal additive guest archival and private PDF identity-document support.
ALTER TABLE public.hotel_guests
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL;

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
WHERE id = 'hotel-identity-documents';

DROP POLICY IF EXISTS "hotel identity documents tenant insert" ON storage.objects;
CREATE POLICY "hotel identity documents tenant insert" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'hotel-identity-documents'
  AND (storage.foldername(name))[1] = public.hotel_tenant_id()::text
  AND (storage.foldername(name))[2] = 'identity-documents'
  AND storage.filename(name) ~ '^[a-z0-9-]+\.(jpg|png|webp|pdf)$'
  AND public.hotel_permission_for(public.hotel_tenant_id(), 'hotel_guests', 'hotel.guests.identity_view')
);
