CREATE INDEX IF NOT EXISTS idx_services_tenant_id_created_at
  ON public.services (tenant_id, created_at DESC);;
