-- Add email column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Update trigger to handle user creation correctly
CREATE OR REPLACE FUNCTION public.tg_handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role_id uuid;
BEGIN
  SELECT id INTO default_role_id FROM public.roles WHERE name = 'Employé';
  
  INSERT INTO public.profiles (id, role_id, status, email, full_name, username)
  VALUES (
    new.id, 
    default_role_id, 
    'actif', 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'username'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    username = COALESCE(public.profiles.username, EXCLUDED.username);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
