-- Canonical profile lifecycle values and server-side access-token invalidation.
-- Additive/idempotent: legacy rows are normalized before replacing the check.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sessions_revoked_at timestamptz;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;

UPDATE public.profiles
SET status = CASE status
  WHEN 'actif' THEN 'active'
  WHEN 'suspendu' THEN 'suspended'
  WHEN 'archivé' THEN 'archived'
  ELSE status
END
WHERE status IN ('actif', 'suspendu', 'archivé');

ALTER TABLE public.profiles ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('active', 'suspended', 'archived')) NOT VALID;
ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_status_check;

CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles (status);

CREATE OR REPLACE FUNCTION public.tg_handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role_id uuid;
BEGIN
  SELECT id INTO default_role_id
  FROM public.roles
  WHERE name IN ('Employé', 'Employee')
  ORDER BY CASE WHEN name = 'Employé' THEN 0 ELSE 1 END
  LIMIT 1;

  INSERT INTO public.profiles (id, role_id, status)
  VALUES (new.id, default_role_id, 'active')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;
