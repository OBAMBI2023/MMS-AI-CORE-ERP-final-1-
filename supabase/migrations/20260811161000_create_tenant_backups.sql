-- Sauvegardes: tenant_backups tracks manual/automatic data export runs.
-- No table this app already has is touched — purely additive.
--
-- Write surface is intentionally narrow, mirroring support_tickets
-- (20260810160000_create_support_module.sql): RLS grants `authenticated`
-- ONLY a SELECT policy. There is no INSERT/UPDATE/DELETE policy for
-- `authenticated` at all — every row is created/updated by the create-backup
-- and run-scheduled-backups Edge Functions using the service_role client,
-- which bypasses RLS entirely. backup.create is therefore enforced in that
-- Edge Function's application code (it calls has_permission('backup.create')
-- via RPC before doing anything), NOT via a table WITH CHECK clause — this is
-- deliberate, not an oversight, since a client can never legitimately insert
-- into this table directly (the backup file itself must be built server-side).

CREATE TABLE public.tenant_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  backup_type text NOT NULL CHECK (backup_type IN ('manuel', 'automatique')),
  modules jsonb NOT NULL DEFAULT '[]'::jsonb,
  record_count integer,
  storage_path text,
  status text NOT NULL DEFAULT 'en_attente'
    CHECK (status IN ('en_attente', 'en_cours', 'terminee', 'echec')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz
);

CREATE INDEX tenant_backups_tenant_created_idx
  ON public.tenant_backups (tenant_id, created_at DESC);

ALTER TABLE public.tenant_backups ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.tenant_backups TO authenticated;
GRANT ALL ON public.tenant_backups TO service_role;

CREATE POLICY "tenant_backups_select" ON public.tenant_backups
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permission('backup.view'));
