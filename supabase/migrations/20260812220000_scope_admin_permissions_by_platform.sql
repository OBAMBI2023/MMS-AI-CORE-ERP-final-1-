CREATE OR REPLACE FUNCTION public.grant_permission_to_tenant_admins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.code LIKE 'hotel.%' THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r.id, NEW.id
    FROM public.roles r
    JOIN public.tenants t ON t.id = r.tenant_id
    WHERE r.name = 'Administrateur'
      AND t.platform_type = 'HOTEL'
      AND t.is_active
      AND t.deleted_at IS NULL
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  ELSE
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r.id, NEW.id
    FROM public.roles r
    WHERE r.name = 'Administrateur'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_administrator_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  role_name text;
  platform_type text;
  permission_code text;
BEGIN
  SELECT r.name, t.platform_type, p.code
    INTO role_name, platform_type, permission_code
  FROM public.roles r
  JOIN public.tenants t ON t.id = r.tenant_id
  JOIN public.permissions p ON p.id = OLD.permission_id
  WHERE r.id = OLD.role_id;

  IF role_name IS DISTINCT FROM 'Administrateur' THEN
    RETURN OLD;
  END IF;

  IF permission_code LIKE 'hotel.%' AND platform_type IS DISTINCT FROM 'HOTEL' THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'Les permissions Administrateur sont protégées';
END;
$$;

DELETE FROM public.role_permissions rp
USING public.roles r,
      public.tenants t,
      public.permissions p
WHERE rp.role_id = r.id
  AND r.tenant_id = t.id
  AND rp.permission_id = p.id
  AND p.code = 'hotel.guests.identity_manage'
  AND r.name = 'Administrateur'
  AND t.platform_type IS DISTINCT FROM 'HOTEL';
