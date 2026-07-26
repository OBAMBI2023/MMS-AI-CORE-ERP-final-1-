-- Global platform administrators are deliberately kept outside tenant RBAC.
-- Rows can only be managed through trusted service-role operations.
CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.platform_admins FROM anon, authenticated;
GRANT SELECT ON TABLE public.platform_admins TO authenticated;
GRANT ALL ON TABLE public.platform_admins TO service_role;

DROP POLICY IF EXISTS "platform_admins_read_own_membership" ON public.platform_admins;
CREATE POLICY "platform_admins_read_own_membership"
  ON public.platform_admins
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
