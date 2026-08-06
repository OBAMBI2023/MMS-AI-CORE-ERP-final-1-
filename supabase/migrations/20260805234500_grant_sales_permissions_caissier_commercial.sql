-- Caissier and Commercial cannot create a sale: role_permissions never
-- contains rows granting them ventes.view / ventes.create. The RLS policies
-- ventes_insert_authorized / vente_items_insert_authorized (and their SELECT
-- counterparts) gate on has_permission(code), which succeeds only for
-- Administrateur (via is_admin() bypass in has_permission()) or an explicit
-- role_permissions row — neither role ever received one:
--   - initialize_tenant_roles() copies each default role's permissions from a
--     same-named "template" role via
--       WHERE template_role.name = default_role.template_name
--         AND template_role.id <> created_role_id
--     For Caissier, template_name is also 'Caissier', so the only matching
--     template row is the one just inserted in this same loop iteration —
--     excluded by "id <> created_role_id" — leaving it with zero rows.
--   - Commercial is not even in that function's default role list; it is
--     created separately by trg_ensure_tenant_commercial_role, which never
--     inserts role_permissions at all.
-- ventes.delete stays Administrateur-only (ventes_delete_admin_only /
-- vente_items_delete_admin_only already restrict it via is_admin(), untouched
-- here), and no other permission code is granted to these roles.

-- 1) Backfill: grant the missing sale permissions to Caissier/Commercial on
-- every existing tenant. Idempotent — safe to re-run.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.roles role
CROSS JOIN public.permissions permission
WHERE role.name IN ('Caissier', 'Commercial')
  AND permission.code IN ('ventes.view', 'ventes.create')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 2) Forward fix: append the same grant to initialize_tenant_roles() so
-- future tenants get it automatically, without altering the existing
-- (unrelated) template-copy behaviour for other roles.
CREATE OR REPLACE FUNCTION public.initialize_tenant_roles(
  target_tenant_id uuid,
  first_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role record;
  created_role_id uuid;
  admin_role_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = target_tenant_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'Tenant introuvable',
      DETAIL = format('tenant_id=%s', target_tenant_id),
      HINT = 'Créer le tenant avant d''initialiser ses rôles.';
  END IF;

  FOR default_role IN
    SELECT *
    FROM (VALUES
      ('Administrateur', 'Accès total à tous les modules', 'Administrateur'),
      ('Manager', 'Gestion des ventes, achats, dépenses et rapports', 'Manager'),
      ('Gérant', 'Gestion opérationnelle du tenant', 'Manager'),
      ('Comptable', 'Gestion des dépenses et rapports financiers', 'Comptable'),
      ('Caissier', 'Gestion exclusive des ventes POS', 'Caissier'),
      ('Employé', 'Accès limité (lecture seulement)', 'Employé')
    ) AS defaults(name, description, template_name)
  LOOP
    INSERT INTO public.roles (tenant_id, name, description)
    VALUES (target_tenant_id, default_role.name, default_role.description)
    ON CONFLICT (tenant_id, name)
    DO UPDATE SET description = COALESCE(public.roles.description, EXCLUDED.description)
    RETURNING id INTO created_role_id;

    IF default_role.name = 'Administrateur' THEN
      admin_role_id := created_role_id;
      INSERT INTO public.role_permissions (role_id, permission_id)
      SELECT created_role_id, permission.id
      FROM public.permissions permission
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    ELSE
      INSERT INTO public.role_permissions (role_id, permission_id)
      SELECT created_role_id, template_permission.permission_id
      FROM public.roles template_role
      JOIN public.role_permissions template_permission
        ON template_permission.role_id = template_role.id
      WHERE template_role.tenant_id = target_tenant_id
        AND template_role.name = default_role.template_name
        AND template_role.id <> created_role_id
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
  END LOOP;

  -- Caissier and Commercial must always be able to sell, regardless of the
  -- template-copy outcome above (see header comment for why that copy is a
  -- no-op for Caissier, and why Commercial isn't in the loop at all).
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role.id, permission.id
  FROM public.roles role
  CROSS JOIN public.permissions permission
  WHERE role.tenant_id = target_tenant_id
    AND role.name IN ('Caissier', 'Commercial')
    AND permission.code IN ('ventes.view', 'ventes.create')
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  IF first_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET tenant_id = target_tenant_id,
        role_id = admin_role_id
    WHERE id = first_user_id
      AND (tenant_id IS NULL OR tenant_id = target_tenant_id);

    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'Le premier utilisateur est introuvable ou appartient à un autre tenant',
        DETAIL = format('user_id=%s, tenant_id=%s', first_user_id, target_tenant_id),
        HINT = 'Créer le profil sans rôle, puis appeler initialize_tenant_roles avec le même tenant.';
    END IF;
  END IF;

  RETURN admin_role_id;
END
$$;
