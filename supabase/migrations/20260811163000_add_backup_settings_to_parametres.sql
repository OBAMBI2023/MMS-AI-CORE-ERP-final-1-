-- Sauvegardes: automatic-backup settings and last-success tracking live on
-- the existing per-tenant `parametres` singleton (already fetched in full on
-- every Paramètres page load, so no new query is needed to render the tab).
-- All columns are nullable/defaulted, so existing rows are unaffected.

ALTER TABLE public.parametres
  ADD COLUMN backup_auto_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN backup_auto_frequency text
    CHECK (backup_auto_frequency IN ('quotidienne', 'hebdomadaire', 'mensuelle')),
  ADD COLUMN backup_auto_last_run_at timestamptz,
  ADD COLUMN backup_last_success_at timestamptz;
