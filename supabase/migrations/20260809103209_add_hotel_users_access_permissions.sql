-- Additive only: exposes the "Utilisateurs & accès" sub-module inside
-- Paramètres Hôtel. No existing column, policy, role or table is modified.
--
-- Granting is intentionally automatic and Administrateur-only: the shared
-- server functions in src/lib/user-management.server.ts (create/update/
-- delete/toggle-status/reset-password, reused as-is by this sub-module)
-- hard-require the caller's role to be named exactly 'Administrateur'
-- (see getAdminTenantContext). Granting these permissions to a secondary
-- role (e.g. "Gérant") would show working list/UI but every action button
-- would still fail server-side — so we don't do that here.
--
-- The existing trigger trg_grant_permission_to_tenant_admins (see
-- 20260802220000_secure_tenant_role_management.sql) auto-grants any newly
-- inserted permission to every tenant's Administrateur role, so no explicit
-- role_permissions insert is required.
INSERT INTO public.permissions (code, description) VALUES
  ('hotel.users.view', 'Voir les utilisateurs Hôtel'),
  ('hotel.users.manage', 'Gérer les utilisateurs Hôtel (rôle, statut, invitation)')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;
;
