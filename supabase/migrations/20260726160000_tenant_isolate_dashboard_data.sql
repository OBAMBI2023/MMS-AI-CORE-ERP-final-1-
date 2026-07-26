-- Enforce tenant isolation at the database boundary for every table read by
-- the tenant Dashboard. Client-side filters remain useful, but must not be the
-- security boundary.

ALTER TABLE public.ventes
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.achats
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.depenses
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.fournisseurs
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.devis
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

CREATE INDEX IF NOT EXISTS idx_ventes_tenant_id ON public.ventes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_achats_tenant_id ON public.achats(tenant_id);
CREATE INDEX IF NOT EXISTS idx_depenses_tenant_id ON public.depenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON public.clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fournisseurs_tenant_id ON public.fournisseurs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_services_tenant_id ON public.services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_devis_tenant_id ON public.devis(tenant_id);

ALTER TABLE public.ventes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fournisseurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public rw ventes" ON public.ventes;
DROP POLICY IF EXISTS "tenant isolation ventes" ON public.ventes;
CREATE POLICY "tenant isolation ventes" ON public.ventes
  FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "public rw achats" ON public.achats;
DROP POLICY IF EXISTS "tenant isolation achats" ON public.achats;
CREATE POLICY "tenant isolation achats" ON public.achats
  FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "public rw depenses" ON public.depenses;
DROP POLICY IF EXISTS "tenant isolation depenses" ON public.depenses;
CREATE POLICY "tenant isolation depenses" ON public.depenses
  FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "public rw clients" ON public.clients;
DROP POLICY IF EXISTS "tenant isolation clients" ON public.clients;
CREATE POLICY "tenant isolation clients" ON public.clients
  FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "public rw fournisseurs" ON public.fournisseurs;
DROP POLICY IF EXISTS "tenant isolation fournisseurs" ON public.fournisseurs;
CREATE POLICY "tenant isolation fournisseurs" ON public.fournisseurs
  FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "public rw services" ON public.services;
DROP POLICY IF EXISTS "tenant isolation services" ON public.services;
CREATE POLICY "tenant isolation services" ON public.services
  FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "public rw devis" ON public.devis;
DROP POLICY IF EXISTS "tenant isolation devis" ON public.devis;
CREATE POLICY "tenant isolation devis" ON public.devis
  FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
