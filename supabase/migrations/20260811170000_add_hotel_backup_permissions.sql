-- Sauvegardes Hôtel: dedicated RBAC permissions, separate namespace from the
-- ERP backup.view/backup.create pair, following the existing hotel.<module>.
-- <verb> convention (hotel.expenses.view, hotel.settings.update, ...).

INSERT INTO public.permissions (code, description)
VALUES
  ('hotel.backups.view', 'Voir les sauvegardes du tenant Hôtel'),
  ('hotel.backups.create', 'Créer une sauvegarde du tenant Hôtel')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;

-- Same grant pattern as 20260811160000_add_backup_permissions.sql: only the
-- tenant's own "Administrateur" role (roles are tenant-scoped, so this
-- naturally covers every HOTEL tenant's Administrateur without needing a
-- platform_type filter here). Other roles receive it only if a tenant admin
-- explicitly enables it later via the permissions UI.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.roles role
CROSS JOIN public.permissions permission
WHERE role.name = 'Administrateur'
  AND permission.code IN ('hotel.backups.view', 'hotel.backups.create')
ON CONFLICT (role_id, permission_id) DO NOTHING;
