-- Sauvegardes: hourly scheduler that invokes the run-scheduled-backups Edge
-- Function, which itself finds tenants due for an automatic backup
-- (backup_auto_enabled + frequency/last-run on public.parametres) and
-- generates them. Hourly resolution is more than enough for
-- quotidienne/hebdomadaire/mensuelle frequencies while keeping pg_net
-- traffic low.
--
-- PREREQUISITE (manual, one-time, must be run BEFORE this migration is
-- applied — never commit a real secret value to a migration file in git):
--   select vault.create_secret('<the project''s actual service_role key>', 'service_role_key');
-- run directly against the project via the SQL editor or CLI.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'run-scheduled-backups-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://sobcdanmtibjoxvkezfz.supabase.co/functions/v1/run-scheduled-backups',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
