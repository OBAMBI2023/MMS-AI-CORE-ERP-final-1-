-- ============================================================================
-- 1. Updates to profiles table
-- ============================================================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
ADD COLUMN IF NOT EXISTS last_login_ip text;

-- ============================================================================
-- 2. Activity Logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id),
  affected_user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. RLS for Logs
-- ============================================================================
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_logs" ON public.activity_logs;
CREATE POLICY "admin_read_logs" ON public.activity_logs FOR SELECT USING (public.is_admin());

-- Allow inserting logs (via server-side function, so we can use security definer)
DROP POLICY IF EXISTS "admin_insert_logs" ON public.activity_logs;
CREATE POLICY "admin_insert_logs" ON public.activity_logs FOR INSERT WITH CHECK (public.is_admin());
