-- 1. Extend Permissions with Action Groups (Module-based)
ALTER TABLE public.permissions ADD COLUMN IF NOT EXISTS module text;

-- 2. Audit Log Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  role_id uuid REFERENCES public.roles(id),
  action text NOT NULL,
  module text NOT NULL,
  entity_id text,
  metadata jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs(module);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins_read_audit_logs" ON public.audit_logs FOR SELECT USING (public.is_admin());
