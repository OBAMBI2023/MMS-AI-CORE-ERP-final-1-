-- Sauvegardes: private, tenant-isolated storage bucket for backup ZIP
-- archives. Path convention: "<tenant_id>/<backup_id>.zip", mirroring the
-- hotel-expense-receipts / support-attachments bucket shape.
--
-- Only a SELECT policy is granted to `authenticated` (needed so useSignedUrl,
-- running as the logged-in tenant user, can mint a signed URL for
-- "Télécharger"). No INSERT/UPDATE/DELETE policy for `authenticated`: only
-- the create-backup / run-scheduled-backups Edge Functions' service_role
-- client ever writes or removes objects in this bucket (service_role
-- bypasses storage RLS by default, so no policy is needed for it either).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'backup-archives',
  'backup-archives',
  false,
  524288000,
  ARRAY['application/zip']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "backup archives tenant read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'backup-archives'
    AND (storage.foldername(name))[1] = (public.current_tenant_id())::text
    AND public.has_permission('backup.view')
  );
