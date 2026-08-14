CREATE UNIQUE INDEX IF NOT EXISTS clients_tenant_email_key
  ON public.clients (tenant_id, public.normalize_client_email(email))
  WHERE tenant_id IS NOT NULL AND public.normalize_client_email(email) IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS clients_tenant_phone_key
  ON public.clients (tenant_id, public.normalize_client_phone(phone))
  WHERE tenant_id IS NOT NULL AND public.normalize_client_phone(phone) IS NOT NULL;
;
