
-- ============ Trigger util ============
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ Clients ============
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO anon, authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_clients_upd BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ Fournisseurs ============
CREATE TABLE public.fournisseurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fournisseurs TO anon, authenticated;
GRANT ALL ON public.fournisseurs TO service_role;
ALTER TABLE public.fournisseurs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw fournisseurs" ON public.fournisseurs FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_fournisseurs_upd BEFORE UPDATE ON public.fournisseurs FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ Services (catalogue) ============
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Autre',
  unit text NOT NULL DEFAULT 'unité',
  price numeric(12,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO anon, authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw services" ON public.services FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_services_upd BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ Ventes ============
CREATE TABLE public.ventes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'Espèces',
  cashier text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ventes TO anon, authenticated;
GRANT ALL ON public.ventes TO service_role;
ALTER TABLE public.ventes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw ventes" ON public.ventes FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.vente_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vente_id uuid NOT NULL REFERENCES public.ventes(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  name text NOT NULL,
  unit text,
  qty numeric(12,2) NOT NULL DEFAULT 1,
  price numeric(12,2) NOT NULL DEFAULT 0,
  line_total numeric(12,2) NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vente_items TO anon, authenticated;
GRANT ALL ON public.vente_items TO service_role;
ALTER TABLE public.vente_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw vente_items" ON public.vente_items FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX ON public.vente_items(vente_id);

-- ============ Devis ============
CREATE TABLE public.devis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text,
  status text NOT NULL DEFAULT 'brouillon',
  due_date date,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devis TO anon, authenticated;
GRANT ALL ON public.devis TO service_role;
ALTER TABLE public.devis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw devis" ON public.devis FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_devis_upd BEFORE UPDATE ON public.devis FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.devis_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  devis_id uuid NOT NULL REFERENCES public.devis(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  name text NOT NULL,
  unit text,
  qty numeric(12,2) NOT NULL DEFAULT 1,
  price numeric(12,2) NOT NULL DEFAULT 0,
  line_total numeric(12,2) NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devis_items TO anon, authenticated;
GRANT ALL ON public.devis_items TO service_role;
ALTER TABLE public.devis_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw devis_items" ON public.devis_items FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX ON public.devis_items(devis_id);

-- ============ Achats ============
CREATE TABLE public.achats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  fournisseur_id uuid REFERENCES public.fournisseurs(id) ON DELETE SET NULL,
  fournisseur_name text,
  total numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'reçu',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.achats TO anon, authenticated;
GRANT ALL ON public.achats TO service_role;
ALTER TABLE public.achats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw achats" ON public.achats FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.achat_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  achat_id uuid NOT NULL REFERENCES public.achats(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit text,
  qty numeric(12,2) NOT NULL DEFAULT 1,
  price numeric(12,2) NOT NULL DEFAULT 0,
  line_total numeric(12,2) NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.achat_items TO anon, authenticated;
GRANT ALL ON public.achat_items TO service_role;
ALTER TABLE public.achat_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw achat_items" ON public.achat_items FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX ON public.achat_items(achat_id);

-- ============ Dépenses ============
CREATE TABLE public.depenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'Général',
  description text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  paid_at date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.depenses TO anon, authenticated;
GRANT ALL ON public.depenses TO service_role;
ALTER TABLE public.depenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw depenses" ON public.depenses FOR ALL USING (true) WITH CHECK (true);

-- ============ Paramètres (singleton) ============
CREATE TABLE public.parametres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'Maguy Multi Services',
  address text,
  phone text,
  email text,
  currency text NOT NULL DEFAULT 'FCFA',
  logo_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parametres TO anon, authenticated;
GRANT ALL ON public.parametres TO service_role;
ALTER TABLE public.parametres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw parametres" ON public.parametres FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_parametres_upd BEFORE UPDATE ON public.parametres FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.parametres (company_name, currency) VALUES ('Maguy Multi Services', 'FCFA');

-- ============ Seed services (catalogue POS) ============
INSERT INTO public.services (name, category, unit, price) VALUES
  ('Impression N&B A4', 'Impression', 'page', 100),
  ('Impression Couleur A4', 'Impression', 'page', 300),
  ('Impression N&B A3', 'Impression', 'page', 250),
  ('Impression Couleur A3', 'Impression', 'page', 600),
  ('Photo d''identité', 'Impression', 'planche', 1500),
  ('Photocopie N&B A4', 'Copie', 'page', 50),
  ('Photocopie Couleur A4', 'Copie', 'page', 200),
  ('Scan document', 'Numérique', 'page', 200),
  ('Gravure CD/DVD', 'Numérique', 'unité', 1000),
  ('Reliure spirale', 'Reliure', 'unité', 1500),
  ('Reliure thermique', 'Reliure', 'unité', 2500),
  ('Plastification A4', 'Finition', 'unité', 500),
  ('Plastification A3', 'Finition', 'unité', 1000),
  ('Découpe / Massicot', 'Finition', 'lot', 300);
