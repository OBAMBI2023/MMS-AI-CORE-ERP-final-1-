-- Migration: Ensure Admin role has all permissions
DO $$
DECLARE
  admin_role_id uuid;
  perm_id uuid;
BEGIN
  -- Get Admin Role ID
  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'Administrateur';

  -- Loop through all permissions and assign them to Admin if not already assigned
  FOR perm_id IN SELECT id FROM public.permissions
  LOOP
    INSERT INTO public.role_permissions (role_id, permission_id)
    VALUES (admin_role_id, perm_id)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END LOOP;
END $$;
