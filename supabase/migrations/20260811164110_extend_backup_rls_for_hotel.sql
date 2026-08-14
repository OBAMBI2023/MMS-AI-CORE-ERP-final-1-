DROP POLICY IF EXISTS "tenant_backups_select" ON public.tenant_backups;

CREATE POLICY "tenant_backups_select" ON public.tenant_backups
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (
      (
        EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.platform_type = 'HOTEL')
        AND public.has_permission('hotel.backups.view')
      )
      OR (
        EXISTS (
          SELECT 1 FROM public.tenants t
          WHERE t.id = tenant_id AND (t.platform_type IS NULL OR t.platform_type <> 'HOTEL')
        )
        AND public.has_permission('backup.view')
      )
    )
  );

DROP POLICY IF EXISTS "backup archives tenant read" ON storage.objects;

CREATE POLICY "backup archives tenant read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'backup-archives'
    AND (storage.foldername(name))[1] = (public.current_tenant_id())::text
    AND (
      (
        EXISTS (
          SELECT 1 FROM public.tenants t
          WHERE t.id = public.current_tenant_id() AND t.platform_type = 'HOTEL'
        )
        AND public.has_permission('hotel.backups.view')
      )
      OR (
        EXISTS (
          SELECT 1 FROM public.tenants t
          WHERE t.id = public.current_tenant_id()
            AND (t.platform_type IS NULL OR t.platform_type <> 'HOTEL')
        )
        AND public.has_permission('backup.view')
      )
    )
  );
;
