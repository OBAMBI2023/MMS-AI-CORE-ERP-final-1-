-- Activates the per-tenant anti-duplicate unique indexes on clients that
-- were skipped in add_clients_duplicate_guard because pre-existing test
-- data violated them. That test data has since been cleaned up (backed up
-- to public._clients_cleanup_backup_20260809 beforehand), so the indexes
-- can now be created unconditionally.

CREATE UNIQUE INDEX IF NOT EXISTS clients_tenant_email_key
  ON public.clients (tenant_id, public.normalize_client_email(email))
  WHERE tenant_id IS NOT NULL AND public.normalize_client_email(email) IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS clients_tenant_phone_key
  ON public.clients (tenant_id, public.normalize_client_phone(phone))
  WHERE tenant_id IS NOT NULL AND public.normalize_client_phone(phone) IS NOT NULL;
