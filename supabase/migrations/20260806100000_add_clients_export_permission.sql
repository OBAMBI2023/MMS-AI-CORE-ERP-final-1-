-- Clients exports have their own assignable RBAC permission, mirroring
-- fournisseurs.export.
INSERT INTO public.permissions (code, description)
VALUES ('clients.export', 'Exporter la liste des clients')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;

-- Preserve full access for every tenant administrator. Other roles receive
-- this permission only when it is explicitly enabled in the permissions UI.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.roles role
CROSS JOIN public.permissions permission
WHERE role.name = 'Administrateur'
  AND permission.code = 'clients.export'
ON CONFLICT (role_id, permission_id) DO NOTHING;
