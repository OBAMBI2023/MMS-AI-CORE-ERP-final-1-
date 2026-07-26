INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'catalog-images',
  'catalog-images',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "catalog images tenant read" ON storage.objects;
CREATE POLICY "catalog images tenant read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'catalog-images'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

DROP POLICY IF EXISTS "catalog images tenant insert" ON storage.objects;
CREATE POLICY "catalog images tenant insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'catalog-images'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

DROP POLICY IF EXISTS "catalog images tenant update" ON storage.objects;
CREATE POLICY "catalog images tenant update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'catalog-images'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
  )
  WITH CHECK (
    bucket_id = 'catalog-images'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

DROP POLICY IF EXISTS "catalog images tenant delete" ON storage.objects;
CREATE POLICY "catalog images tenant delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'catalog-images'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
  );
