-- ============================================================================
-- MMS AI CORE — Reconstruction propre du schéma (2026-07-16)
-- ============================================================================
-- Ce fichier remplace l'historique de migrations précédent (voir
-- supabase/migrations_archive/ pour référence). Il est écrit pour être
-- appliqué en toute sécurité sur la base de données déjà en place :
--   - les tables existantes sont conservées (CREATE TABLE IF NOT EXISTS)
--   - les colonnes manquantes sont ajoutées (ALTER ... ADD COLUMN IF NOT EXISTS)
--   - aucune donnée existante n'est supprimée
--   - les policies RLS sont recréées de façon idempotente
--
-- Objectifs :
--   1. Corriger le bug réel : la table `achats` ne possédait pas de colonne
--      `subtotal` alors que le code applicatif l'insère systématiquement.
--   2. Isoler les clés API IA (OpenAI / Gemini / Claude) dans une table
--      totalement inaccessible depuis le navigateur (aucune policy RLS pour
--      anon/authenticated), au lieu de les exposer dans `parametres` qui est
--      lisible/écrivable par la clé publique.
--   3. Ajouter les contraintes, index et valeurs par défaut manquants.
--   4. Harmoniser `updated_at` + trigger sur toutes les tables transactionnelles.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Fonction utilitaire (trigger updated_at)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================================
-- 1. CLIENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (btrim(name) <> ''),
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients (lower(name));

DROP TRIGGER IF EXISTS trg_clients_upd ON public.clients;
CREATE TRIGGER trg_clients_upd BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO anon, authenticated;
GRANT ALL ON public.clients TO service_role;
DROP POLICY IF EXISTS "public rw clients" ON public.clients;
CREATE POLICY "public rw clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 2. FOURNISSEURS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.fournisseurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (btrim(name) <> ''),
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fournisseurs_created_at ON public.fournisseurs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fournisseurs_name ON public.fournisseurs (lower(name));

DROP TRIGGER IF EXISTS trg_fournisseurs_upd ON public.fournisseurs;
CREATE TRIGGER trg_fournisseurs_upd BEFORE UPDATE ON public.fournisseurs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.fournisseurs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fournisseurs TO anon, authenticated;
GRANT ALL ON public.fournisseurs TO service_role;
DROP POLICY IF EXISTS "public rw fournisseurs" ON public.fournisseurs;
CREATE POLICY "public rw fournisseurs" ON public.fournisseurs FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 3. SERVICES (catalogue POS / devis / achats)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (btrim(name) <> ''),
  category text NOT NULL DEFAULT 'Autre',
  unit text NOT NULL DEFAULT 'unité',
  price numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_services_category ON public.services (category);
CREATE INDEX IF NOT EXISTS idx_services_active ON public.services (active) WHERE active = true;

DROP TRIGGER IF EXISTS trg_services_upd ON public.services;
CREATE TRIGGER trg_services_upd BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO anon, authenticated;
GRANT ALL ON public.services TO service_role;
DROP POLICY IF EXISTS "public rw services" ON public.services;
CREATE POLICY "public rw services" ON public.services FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 4. VENTES (point de vente) + lignes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ventes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text,
  subtotal numeric(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total numeric(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  payment_method text NOT NULL DEFAULT 'Espèces',
  cashier text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ventes_discount_le_subtotal CHECK (discount <= subtotal)
);
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_ventes_client_id ON public.ventes (client_id);
CREATE INDEX IF NOT EXISTS idx_ventes_created_at ON public.ventes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ventes_payment_method ON public.ventes (payment_method);

DROP TRIGGER IF EXISTS trg_ventes_upd ON public.ventes;
CREATE TRIGGER trg_ventes_upd BEFORE UPDATE ON public.ventes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.ventes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ventes TO anon, authenticated;
GRANT ALL ON public.ventes TO service_role;
DROP POLICY IF EXISTS "public rw ventes" ON public.ventes;
CREATE POLICY "public rw ventes" ON public.ventes FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.vente_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vente_id uuid NOT NULL REFERENCES public.ventes(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  name text NOT NULL,
  unit text,
  qty numeric(12,2) NOT NULL DEFAULT 1 CHECK (qty > 0),
  price numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  line_total numeric(12,2) NOT NULL DEFAULT 0 CHECK (line_total >= 0)
);
CREATE INDEX IF NOT EXISTS idx_vente_items_vente_id ON public.vente_items (vente_id);
CREATE INDEX IF NOT EXISTS idx_vente_items_service_id ON public.vente_items (service_id);

ALTER TABLE public.vente_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vente_items TO anon, authenticated;
GRANT ALL ON public.vente_items TO service_role;
DROP POLICY IF EXISTS "public rw vente_items" ON public.vente_items;
CREATE POLICY "public rw vente_items" ON public.vente_items FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 5. DEVIS + lignes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.devis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text,
  status text NOT NULL DEFAULT 'brouillon',
  due_date date,
  subtotal numeric(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total numeric(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT devis_discount_le_subtotal CHECK (discount <= subtotal),
  CONSTRAINT devis_status_valid CHECK (status IN ('brouillon', 'envoyé', 'accepté', 'refusé'))
);
CREATE INDEX IF NOT EXISTS idx_devis_client_id ON public.devis (client_id);
CREATE INDEX IF NOT EXISTS idx_devis_created_at ON public.devis (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_devis_status ON public.devis (status);

DROP TRIGGER IF EXISTS trg_devis_upd ON public.devis;
CREATE TRIGGER trg_devis_upd BEFORE UPDATE ON public.devis
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.devis ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devis TO anon, authenticated;
GRANT ALL ON public.devis TO service_role;
DROP POLICY IF EXISTS "public rw devis" ON public.devis;
CREATE POLICY "public rw devis" ON public.devis FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.devis_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  devis_id uuid NOT NULL REFERENCES public.devis(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  name text NOT NULL,
  unit text,
  qty numeric(12,2) NOT NULL DEFAULT 1 CHECK (qty > 0),
  price numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  line_total numeric(12,2) NOT NULL DEFAULT 0 CHECK (line_total >= 0)
);
CREATE INDEX IF NOT EXISTS idx_devis_items_devis_id ON public.devis_items (devis_id);
CREATE INDEX IF NOT EXISTS idx_devis_items_service_id ON public.devis_items (service_id);

ALTER TABLE public.devis_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devis_items TO anon, authenticated;
GRANT ALL ON public.devis_items TO service_role;
DROP POLICY IF EXISTS "public rw devis_items" ON public.devis_items;
CREATE POLICY "public rw devis_items" ON public.devis_items FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 6. ACHATS + lignes
--    NB: `subtotal` et `discount` étaient absents de la table alors que le
--    formulaire de saisie (LineItemsDialog) les envoie systématiquement.
--    C'était un bug réel qui faisait échouer toute création/édition d'achat.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.achats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  fournisseur_id uuid REFERENCES public.fournisseurs(id) ON DELETE SET NULL,
  fournisseur_name text,
  subtotal numeric(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total numeric(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  status text NOT NULL DEFAULT 'reçu',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT achats_discount_le_subtotal CHECK (discount <= subtotal),
  CONSTRAINT achats_status_valid CHECK (status IN ('commandé', 'reçu', 'payé', 'annulé'))
);
-- Colonnes manquantes ajoutées si la table existait déjà sans elles :
ALTER TABLE public.achats ADD COLUMN IF NOT EXISTS subtotal numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.achats ADD COLUMN IF NOT EXISTS discount numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.achats ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
-- Contraintes ajoutées séparément pour rester idempotent sur une base existante.
-- Vérification directe du catalogue système (pg_constraint) plutôt qu'une
-- capture d'exception : une contrainte UNIQUE crée un index implicite du
-- même nom, dont la collision remonte l'erreur 42P07 (duplicate_table) et
-- non 42710 (duplicate_object) — une simple "EXCEPTION WHEN duplicate_object"
-- ne suffit donc pas à la capturer. Vérifier pg_constraint avant d'agir
-- évite ce problème pour tous les types de contraintes.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'achats_subtotal_nonneg' AND conrelid = 'public.achats'::regclass
  ) THEN
    ALTER TABLE public.achats ADD CONSTRAINT achats_subtotal_nonneg CHECK (subtotal >= 0);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'achats_discount_nonneg' AND conrelid = 'public.achats'::regclass
  ) THEN
    ALTER TABLE public.achats ADD CONSTRAINT achats_discount_nonneg CHECK (discount >= 0);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'achats_status_valid' AND conrelid = 'public.achats'::regclass
  ) THEN
    ALTER TABLE public.achats ADD CONSTRAINT achats_status_valid CHECK (status IN ('commandé', 'reçu', 'payé', 'annulé'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_achats_fournisseur_id ON public.achats (fournisseur_id);
CREATE INDEX IF NOT EXISTS idx_achats_created_at ON public.achats (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_achats_status ON public.achats (status);

DROP TRIGGER IF EXISTS trg_achats_upd ON public.achats;
CREATE TRIGGER trg_achats_upd BEFORE UPDATE ON public.achats
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.achats ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.achats TO anon, authenticated;
GRANT ALL ON public.achats TO service_role;
DROP POLICY IF EXISTS "public rw achats" ON public.achats;
CREATE POLICY "public rw achats" ON public.achats FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.achat_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  achat_id uuid NOT NULL REFERENCES public.achats(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit text,
  qty numeric(12,2) NOT NULL DEFAULT 1 CHECK (qty > 0),
  price numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  line_total numeric(12,2) NOT NULL DEFAULT 0 CHECK (line_total >= 0)
);
CREATE INDEX IF NOT EXISTS idx_achat_items_achat_id ON public.achat_items (achat_id);

ALTER TABLE public.achat_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.achat_items TO anon, authenticated;
GRANT ALL ON public.achat_items TO service_role;
DROP POLICY IF EXISTS "public rw achat_items" ON public.achat_items;
CREATE POLICY "public rw achat_items" ON public.achat_items FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 7. DÉPENSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.depenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'Général',
  description text,
  amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  paid_at date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.depenses ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_depenses_category ON public.depenses (category);
CREATE INDEX IF NOT EXISTS idx_depenses_paid_at ON public.depenses (paid_at DESC);

DROP TRIGGER IF EXISTS trg_depenses_upd ON public.depenses;
CREATE TRIGGER trg_depenses_upd BEFORE UPDATE ON public.depenses
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.depenses ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.depenses TO anon, authenticated;
GRANT ALL ON public.depenses TO service_role;
DROP POLICY IF EXISTS "public rw depenses" ON public.depenses;
CREATE POLICY "public rw depenses" ON public.depenses FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 8. PARAMÈTRES (singleton) — informations publiques de l'entreprise
--    Les clés API IA ont été retirées de cette table : voir section 9.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.parametres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true,
  company_name text NOT NULL DEFAULT 'Maguy Multi Services',
  trade_name text,
  address text,
  city text,
  country text,
  phone text,
  whatsapp text,
  email text,
  website text,
  rccm text,
  tax_number text,
  tax_regime text,
  vat_rate numeric(5,2) CHECK (vat_rate IS NULL OR (vat_rate >= 0 AND vat_rate <= 100)),
  currency text NOT NULL DEFAULT 'FCFA',
  quote_prefix text NOT NULL DEFAULT 'DEV-',
  invoice_prefix text NOT NULL DEFAULT 'FAC-',
  receipt_prefix text NOT NULL DEFAULT 'REC-',
  decimals integer NOT NULL DEFAULT 0,
  date_format text NOT NULL DEFAULT 'dd/MM/yyyy',
  logo_url text,
  signature_url text,
  stamp_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT parametres_singleton_chk CHECK (singleton),
  CONSTRAINT parametres_singleton_uq UNIQUE (singleton)
);
ALTER TABLE public.parametres ADD COLUMN IF NOT EXISTS singleton boolean NOT NULL DEFAULT true;
-- Vérification directe du catalogue système (pg_constraint) plutôt qu'une
-- capture d'exception : c'est précisément ce bloc, sous sa forme précédente
-- (EXCEPTION WHEN duplicate_object), qui provoquait l'erreur 42P07 sur une
-- base neuve. `parametres_singleton_uq` est une contrainte UNIQUE ; son
-- index implicite déjà créé par le CREATE TABLE ci-dessus entre en
-- collision, et cette collision remonte 42P07 (duplicate_table), pas 42710
-- (duplicate_object) — non capturée par l'ancien handler.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'parametres_singleton_chk' AND conrelid = 'public.parametres'::regclass
  ) THEN
    ALTER TABLE public.parametres ADD CONSTRAINT parametres_singleton_chk CHECK (singleton);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'parametres_singleton_uq' AND conrelid = 'public.parametres'::regclass
  ) THEN
    ALTER TABLE public.parametres ADD CONSTRAINT parametres_singleton_uq UNIQUE (singleton);
  END IF;
END $$;

-- ============================================================================
-- 9. INTEGRATION_SETTINGS (singleton) — secrets IA, JAMAIS exposés au client
--    Aucune policy RLS n'est créée pour anon/authenticated : par défaut,
--    Postgres refuse tout accès. Seul le service_role (utilisé uniquement
--    côté serveur via supabaseAdmin) peut lire/écrire cette table.
--    Créée ICI (avant la purge des colonnes sensibles de `parametres` juste
--    en dessous) pour pouvoir y migrer les anciennes clés API si présentes.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.integration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true,
  openai_key text,
  gemini_key text,
  claude_key text,
  ai_model text DEFAULT 'Gemini',
  ai_temperature numeric(3,2) DEFAULT 0.7 CHECK (ai_temperature >= 0 AND ai_temperature <= 1),
  ai_max_tokens integer DEFAULT 2048 CHECK (ai_max_tokens > 0 AND ai_max_tokens <= 32000),
  ai_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT integration_settings_singleton_chk CHECK (singleton),
  CONSTRAINT integration_settings_singleton_uq UNIQUE (singleton)
);

DROP TRIGGER IF EXISTS trg_integration_settings_upd ON public.integration_settings;
CREATE TRIGGER trg_integration_settings_upd BEFORE UPDATE ON public.integration_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;
-- Volontairement AUCUNE policy pour anon/authenticated, et AUCUN GRANT à ces
-- rôles : la table est invisible et inaccessible depuis le navigateur.
REVOKE ALL ON public.integration_settings FROM anon, authenticated;
GRANT ALL ON public.integration_settings TO service_role;

INSERT INTO public.integration_settings (ai_model)
SELECT 'Gemini'
WHERE NOT EXISTS (SELECT 1 FROM public.integration_settings);

-- Migration des anciennes clés IA (si `parametres` venait de l'ancien schéma)
-- vers integration_settings, PUIS suppression des colonnes sensibles.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'parametres' AND column_name = 'openai_key'
  ) THEN
    UPDATE public.integration_settings dst
    SET openai_key = src.openai_key,
        gemini_key = src.gemini_key,
        claude_key = src.claude_key,
        ai_model = COALESCE(src.ai_model, dst.ai_model),
        ai_temperature = COALESCE(src.ai_temperature, dst.ai_temperature),
        ai_max_tokens = COALESCE(src.ai_max_tokens, dst.ai_max_tokens),
        ai_enabled = COALESCE(src.ai_enabled, dst.ai_enabled)
    FROM public.parametres src
    WHERE dst.singleton = true;

    ALTER TABLE public.parametres DROP COLUMN IF EXISTS openai_key;
    ALTER TABLE public.parametres DROP COLUMN IF EXISTS gemini_key;
    ALTER TABLE public.parametres DROP COLUMN IF EXISTS claude_key;
    ALTER TABLE public.parametres DROP COLUMN IF EXISTS ai_model;
    ALTER TABLE public.parametres DROP COLUMN IF EXISTS ai_temperature;
    ALTER TABLE public.parametres DROP COLUMN IF EXISTS ai_max_tokens;
    ALTER TABLE public.parametres DROP COLUMN IF EXISTS ai_enabled;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_parametres_upd ON public.parametres;
CREATE TRIGGER trg_parametres_upd BEFORE UPDATE ON public.parametres
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.parametres ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parametres TO anon, authenticated;
GRANT ALL ON public.parametres TO service_role;
DROP POLICY IF EXISTS "public rw parametres" ON public.parametres;
CREATE POLICY "public rw parametres" ON public.parametres FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.parametres (company_name, currency)
SELECT 'Maguy Multi Services', 'FCFA'
WHERE NOT EXISTS (SELECT 1 FROM public.parametres);

-- ============================================================================
-- 10. STORAGE — bucket des assets de l'entreprise (logo, signature, cachet)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "company-assets read" ON storage.objects;
CREATE POLICY "company-assets read" ON storage.objects FOR SELECT USING (bucket_id = 'company-assets');
DROP POLICY IF EXISTS "company-assets insert" ON storage.objects;
CREATE POLICY "company-assets insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'company-assets');
DROP POLICY IF EXISTS "company-assets update" ON storage.objects;
CREATE POLICY "company-assets update" ON storage.objects FOR UPDATE USING (bucket_id = 'company-assets');
DROP POLICY IF EXISTS "company-assets delete" ON storage.objects;
CREATE POLICY "company-assets delete" ON storage.objects FOR DELETE USING (bucket_id = 'company-assets');

-- ============================================================================
-- 11. Catalogue de services — seed uniquement si la table est vide
-- ============================================================================
INSERT INTO public.services (name, category, unit, price)
SELECT * FROM (VALUES
  ('Impression N&B A4', 'Impression', 'page', 100::numeric),
  ('Impression Couleur A4', 'Impression', 'page', 300::numeric),
  ('Impression N&B A3', 'Impression', 'page', 250::numeric),
  ('Impression Couleur A3', 'Impression', 'page', 600::numeric),
  ('Photo d''identité', 'Impression', 'planche', 1500::numeric),
  ('Photocopie N&B A4', 'Copie', 'page', 50::numeric),
  ('Photocopie Couleur A4', 'Copie', 'page', 200::numeric),
  ('Scan document', 'Numérique', 'page', 200::numeric),
  ('Gravure CD/DVD', 'Numérique', 'unité', 1000::numeric),
  ('Reliure spirale', 'Reliure', 'unité', 1500::numeric),
  ('Reliure thermique', 'Reliure', 'unité', 2500::numeric),
  ('Plastification A4', 'Finition', 'unité', 500::numeric),
  ('Plastification A3', 'Finition', 'unité', 1000::numeric),
  ('Découpe / Massicot', 'Finition', 'lot', 300::numeric)
) AS seed(name, category, unit, price)
WHERE NOT EXISTS (SELECT 1 FROM public.services);

-- ============================================================================
-- 12. Vue de reporting mensuel (bonus, non consommée par le front actuel,
--     disponible pour une future migration de /rapports vers une agrégation
--     SQL plutôt que côté client).
-- ============================================================================
CREATE OR REPLACE VIEW public.v_rapport_mensuel AS
SELECT
  date_trunc('month', months.mois)::date AS mois,
  COALESCE(v.total, 0) AS ventes_total,
  COALESCE(a.total, 0) AS achats_total,
  COALESCE(d.total, 0) AS depenses_total,
  COALESCE(v.total, 0) - COALESCE(a.total, 0) - COALESCE(d.total, 0) AS benefice
FROM (
  SELECT generate_series(
    date_trunc('month', now()) - interval '11 months',
    date_trunc('month', now()),
    interval '1 month'
  ) AS mois
) months
LEFT JOIN (
  SELECT date_trunc('month', created_at) AS mois, SUM(total) AS total
  FROM public.ventes GROUP BY 1
) v ON v.mois = date_trunc('month', months.mois)
LEFT JOIN (
  SELECT date_trunc('month', created_at) AS mois, SUM(total) AS total
  FROM public.achats GROUP BY 1
) a ON a.mois = date_trunc('month', months.mois)
LEFT JOIN (
  SELECT date_trunc('month', paid_at) AS mois, SUM(amount) AS total
  FROM public.depenses GROUP BY 1
) d ON d.mois = date_trunc('month', months.mois)
ORDER BY 1;

GRANT SELECT ON public.v_rapport_mensuel TO anon, authenticated;
