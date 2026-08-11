-- Sauvegardes: extend the tenant_backups and backup-archives SELECT
-- policies to recognize the HOTEL permission namespace
-- (hotel.backups.view), without weakening the ERP path.
--
-- Both branches now also assert the caller's own tenant's platform_type
-- explicitly (mirroring hotel_permission_for()'s own platform check), so:
--   - an ERP tenant's Administrateur (platform_type <> 'HOTEL') still needs
--     exactly backup.view, exactly as before this migration;
--   - a HOTEL tenant's Administrateur (platform_type = 'HOTEL') needs
--     hotel.backups.view instead — even though every tenant's
--     "Administrateur" role was already granted the generic backup.view/
--     backup.create permissions by 20260811160000_add_backup_permissions.sql
--     (that migration granted to role.name = 'Administrateur' with no
--     platform filter), a HOTEL tenant cannot use that grant to read
--     tenant_backups here, because the ERP branch below additionally
--     requires platform_type <> 'HOTEL'. Net effect: strictly narrower than
--     before for HOTEL tenants, unchanged for ERP tenants.

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
