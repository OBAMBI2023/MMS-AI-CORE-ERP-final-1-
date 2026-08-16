-- Reserve HOTEL settings exclusively to the tenant's Administrateur role.
-- This removes any existing accidental grants for secondary HOTEL roles and
-- updates future HOTEL tenant provisioning so the permissions are not re-added.

DELETE FROM public.role_permissions rp
USING public.roles r
JOIN public.tenants t ON t.id = r.tenant_id
JOIN public.permissions p ON p.id = rp.permission_id
WHERE rp.role_id = r.id
  AND t.platform_type = 'HOTEL'
  AND r.name <> 'Administrateur'
  AND p.code IN ('hotel.settings.view', 'hotel.settings.update');

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
  target_platform_type text;
BEGIN
  SELECT platform_type INTO target_platform_type
  FROM public.tenants
  WHERE id = target_tenant_id;

  IF NOT FOUND THEN
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

    ELSIF target_platform_type = 'HOTEL' AND default_role.name IN ('Manager', 'Gérant', 'Comptable') THEN
      INSERT INTO public.role_permissions (role_id, permission_id)
      SELECT created_role_id, permission.id
      FROM public.permissions permission
      WHERE permission.code = ANY(
        CASE default_role.name
          WHEN 'Manager' THEN ARRAY[
            'hotel.expenses.create','hotel.expenses.update','hotel.expenses.view',
            'hotel.guests.create','hotel.guests.identity_manage','hotel.guests.identity_view','hotel.guests.update','hotel.guests.view',
            'hotel.invoices.collect','hotel.invoices.create','hotel.invoices.view',
            'hotel.maintenance.create','hotel.maintenance.update','hotel.maintenance.view',
            'hotel.reports.view',
            'hotel.reservations.create','hotel.reservations.update','hotel.reservations.view',
            'hotel.rooms.create','hotel.rooms.update','hotel.rooms.view'
          ]
          WHEN 'Gérant' THEN ARRAY[
            'hotel.backups.create','hotel.backups.view',
            'hotel.expenses.create','hotel.expenses.delete','hotel.expenses.update','hotel.expenses.view',
            'hotel.guests.create','hotel.guests.delete','hotel.guests.identity_manage','hotel.guests.identity_view','hotel.guests.update','hotel.guests.view',
            'hotel.invoices.collect','hotel.invoices.create','hotel.invoices.export','hotel.invoices.view',
            'hotel.maintenance.create','hotel.maintenance.update','hotel.maintenance.view',
            'hotel.reports.export','hotel.reports.view',
            'hotel.reservations.cancel','hotel.reservations.check_in','hotel.reservations.check_out','hotel.reservations.create','hotel.reservations.delete','hotel.reservations.update','hotel.reservations.view',
            'hotel.rooms.create','hotel.rooms.delete','hotel.rooms.update','hotel.rooms.view',
            'hotel.sms.send','hotel.sms.settings','hotel.sms.view',
            'hotel.users.manage','hotel.users.view'
          ]
          WHEN 'Comptable' THEN ARRAY[
            'hotel.expenses.create','hotel.expenses.delete','hotel.expenses.update','hotel.expenses.view',
            'hotel.invoices.collect','hotel.invoices.create','hotel.invoices.export','hotel.invoices.view',
            'hotel.reports.export','hotel.reports.view',
            'hotel.reservations.view'
          ]
        END
      )
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
