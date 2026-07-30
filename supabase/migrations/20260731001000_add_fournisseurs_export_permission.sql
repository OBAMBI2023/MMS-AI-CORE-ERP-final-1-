-- Fournisseurs exports have their own assignable RBAC permission.
INSERT INTO public.permissions (code, description)
VALUES ('fournisseurs.export', 'Exporter la liste des fournisseurs')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;

-- Preserve full access for every tenant administrator. Other roles receive
-- this permission only when it is explicitly enabled in the permissions UI.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.roles role
CROSS JOIN public.permissions permission
WHERE role.name = 'Administrateur'
  AND permission.code = 'fournisseurs.export'
ON CONFLICT (role_id, permission_id) DO NOTHING;
