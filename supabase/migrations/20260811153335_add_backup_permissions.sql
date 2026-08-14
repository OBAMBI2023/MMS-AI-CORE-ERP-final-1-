-- Sauvegardes: dedicated RBAC permissions for viewing and creating tenant
-- data backups. Mirrors 20260806100000_add_clients_export_permission.sql.

INSERT INTO public.permissions (code, description)
VALUES
  ('backup.view', 'Voir les sauvegardes du tenant'),
  ('backup.create', 'Créer une sauvegarde du tenant')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;

-- Preserve full access for every tenant administrator. Other roles receive
-- these permissions only when explicitly enabled in the permissions UI.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.roles role
CROSS JOIN public.permissions permission
WHERE role.name = 'Administrateur'
  AND permission.code IN ('backup.view', 'backup.create')
ON CONFLICT (role_id, permission_id) DO NOTHING;
;
