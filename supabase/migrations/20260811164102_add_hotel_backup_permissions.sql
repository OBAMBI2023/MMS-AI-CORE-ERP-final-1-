INSERT INTO public.permissions (code, description)
VALUES
  ('hotel.backups.view', 'Voir les sauvegardes du tenant Hôtel'),
  ('hotel.backups.create', 'Créer une sauvegarde du tenant Hôtel')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.roles role
CROSS JOIN public.permissions permission
WHERE role.name = 'Administrateur'
  AND permission.code IN ('hotel.backups.view', 'hotel.backups.create')
ON CONFLICT (role_id, permission_id) DO NOTHING;
;
