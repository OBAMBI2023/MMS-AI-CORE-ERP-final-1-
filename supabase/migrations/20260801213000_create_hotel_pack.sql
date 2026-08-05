-- Additive Hôtel pack built on the existing erp_modules/module_packs system.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Existing tenants remain ERP tenants. The discriminator is intentionally
-- additive so all published ERP flows keep their current behaviour.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS platform_type text NOT NULL DEFAULT 'ERP';

DO $$ BEGIN
  ALTER TABLE public.tenants ADD CONSTRAINT tenants_platform_type_check
    CHECK (platform_type IN ('ERP', 'HOTEL'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO public.erp_modules (code, name, description, icon, sort_order, is_active)
VALUES
  ('hotel_dashboard', 'Tableau de bord Hôtel', 'Disponibilités, occupation et indicateurs Hôtel', 'LayoutDashboard', 120, true),
  ('hotel_reservations', 'Réservations', 'Réservations, paiements et extras', 'CalendarDays', 121, true),
  ('hotel_rooms', 'Chambres et logements', 'Chambres, logements, tarifs et états', 'BedDouble', 122, true),
  ('hotel_guests', 'Clients / Voyageurs', 'Voyageurs, accompagnants et historique', 'ContactRound', 123, true),
  ('hotel_reports', 'Rapports Hôtel', 'Occupation, chiffre d’affaires et résultat net', 'ChartNoAxesCombined', 124, true),
  ('hotel_settings', 'Paramètres Hôtel', 'Configuration de l’établissement hôtelier', 'Settings2', 125, true)
ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description,
  icon=EXCLUDED.icon, sort_order=EXCLUDED.sort_order;

INSERT INTO public.module_packs (name, code, description, is_active)
VALUES ('Hôtel', 'hotel', 'Les 7 modules nécessaires à la gestion d’un hôtel.', true)
ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, is_active=true;

INSERT INTO public.module_pack_items (pack_id, module_id)
SELECT p.id, m.id FROM public.module_packs p JOIN public.erp_modules m ON m.code IN
 ('hotel_dashboard','hotel_reservations','hotel_rooms','hotel_guests','expenses','hotel_reports','hotel_settings')
WHERE p.code='hotel' ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.hotel_room_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (btrim(name)<>''), capacity integer NOT NULL DEFAULT 1 CHECK(capacity>0),
  base_rate numeric(14,2) NOT NULL DEFAULT 0 CHECK(base_rate>=0), amenities text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,name)
);
CREATE TABLE IF NOT EXISTS public.hotel_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  room_type_id uuid REFERENCES public.hotel_room_types(id) ON DELETE SET NULL, number text NOT NULL CHECK(btrim(number)<>''),
  capacity integer NOT NULL DEFAULT 1 CHECK(capacity>0), rate numeric(14,2) NOT NULL DEFAULT 0 CHECK(rate>=0),
  amenities text[] NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'available'
    CHECK(status IN ('available','occupied','maintenance','cleaning','out_of_service')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,number),
  UNIQUE(id,tenant_id)
);
CREATE TABLE IF NOT EXISTS public.hotel_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  first_name text NOT NULL CHECK(btrim(first_name)<>''), last_name text NOT NULL CHECK(btrim(last_name)<>''),
  phone text, email text, identity_type text, identity_number text, identity_document_path text,
  nationality text, address text, notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id,tenant_id)
);
CREATE TABLE IF NOT EXISTS public.hotel_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL, room_id uuid NOT NULL, check_in date NOT NULL, check_out date NOT NULL,
  nightly_rate numeric(14,2) NOT NULL CHECK(nightly_rate>=0), discount numeric(14,2) NOT NULL DEFAULT 0 CHECK(discount>=0),
  status text NOT NULL DEFAULT 'confirmed' CHECK(status IN ('pending','confirmed','checked_in','checked_out','cancelled','no_show')),
  notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  nights integer GENERATED ALWAYS AS (check_out-check_in) STORED,
  accommodation_total numeric(14,2) GENERATED ALWAYS AS (greatest(0,(check_out-check_in)*nightly_rate-discount)) STORED,
  CHECK(check_out>check_in), FOREIGN KEY(guest_id,tenant_id) REFERENCES public.hotel_guests(id,tenant_id),
  FOREIGN KEY(room_id,tenant_id) REFERENCES public.hotel_rooms(id,tenant_id), UNIQUE(id,tenant_id)
);
DO $$ BEGIN
  ALTER TABLE public.hotel_reservations ADD CONSTRAINT hotel_reservations_no_overlap
    EXCLUDE USING gist (tenant_id WITH =, room_id WITH =, daterange(check_in,check_out,'[)') WITH &&)
    WHERE (status IN ('pending','confirmed','checked_in'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS public.hotel_reservation_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  reservation_id uuid NOT NULL, label text NOT NULL CHECK(btrim(label)<>''), quantity numeric(12,2) NOT NULL DEFAULT 1 CHECK(quantity>0),
  unit_price numeric(14,2) NOT NULL CHECK(unit_price>=0), created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(reservation_id,tenant_id) REFERENCES public.hotel_reservations(id,tenant_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS public.hotel_reservation_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  reservation_id uuid NOT NULL, amount numeric(14,2) NOT NULL CHECK(amount>0), method text NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(), reference text, notes text,
  FOREIGN KEY(reservation_id,tenant_id) REFERENCES public.hotel_reservations(id,tenant_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS public.hotel_guest_companions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  reservation_id uuid NOT NULL, full_name text NOT NULL, identity_number text,
  FOREIGN KEY(reservation_id,tenant_id) REFERENCES public.hotel_reservations(id,tenant_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS public.hotel_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE, establishment_name text,
  check_in_time time NOT NULL DEFAULT '14:00', check_out_time time NOT NULL DEFAULT '12:00', tax_rate numeric(6,3) NOT NULL DEFAULT 0,
  payment_methods text[] NOT NULL DEFAULT ARRAY['Espèces','Carte','Virement'], cancellation_policy text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.hotel_tenant_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT tenant_id FROM public.profiles WHERE id=auth.uid() AND status='active' LIMIT 1
$$;
CREATE OR REPLACE FUNCTION public.hotel_module_enabled(code text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS (
   SELECT 1 FROM public.tenants t
   WHERE t.id=public.hotel_tenant_id() AND t.platform_type='HOTEL'
 ) AND public.current_user_module_enabled(code)
$$;

CREATE OR REPLACE FUNCTION public.set_authenticated_hotel_tenant() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NOT NULL THEN
  NEW.tenant_id:=public.hotel_tenant_id();
  IF NEW.tenant_id IS NULL THEN RAISE EXCEPTION 'Tenant authentifié introuvable'; END IF;
 END IF;
 RETURN NEW;
END $$;

DO $$ DECLARE t text; code text; BEGIN
 FOR t,code IN SELECT * FROM (VALUES
  ('hotel_room_types','hotel_rooms'),('hotel_rooms','hotel_rooms'),('hotel_guests','hotel_guests'),
  ('hotel_reservations','hotel_reservations'),('hotel_reservation_extras','hotel_reservations'),
  ('hotel_reservation_payments','hotel_reservations'),('hotel_guest_companions','hotel_guests'),('hotel_settings','hotel_settings')) v(t,c)
 LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('DROP POLICY IF EXISTS hotel_tenant_access ON public.%I',t);
  EXECUTE format('CREATE POLICY hotel_tenant_access ON public.%I FOR ALL TO authenticated USING (tenant_id=public.hotel_tenant_id() AND public.hotel_module_enabled(%L)) WITH CHECK (tenant_id=public.hotel_tenant_id() AND public.hotel_module_enabled(%L))',t,code,code);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon; GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO authenticated; GRANT ALL ON public.%I TO service_role',t,t,t);
  EXECUTE format('DROP TRIGGER IF EXISTS set_authenticated_hotel_tenant ON public.%I',t);
  EXECUTE format('CREATE TRIGGER set_authenticated_hotel_tenant BEFORE INSERT OR UPDATE OF tenant_id ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_authenticated_hotel_tenant()',t);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.hotel_tenant_id(), public.hotel_module_enabled(text), public.set_authenticated_hotel_tenant() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hotel_tenant_id(), public.hotel_module_enabled(text) TO authenticated,service_role;

CREATE OR REPLACE VIEW public.hotel_reservation_balances WITH (security_invoker=true) AS
SELECT r.*, coalesce(e.total,0) extras_total, coalesce(p.total,0) paid_total,
 r.accommodation_total+coalesce(e.total,0) grand_total,
 r.accommodation_total+coalesce(e.total,0)-coalesce(p.total,0) balance_due
FROM public.hotel_reservations r
LEFT JOIN (SELECT tenant_id,reservation_id,sum(quantity*unit_price) total FROM public.hotel_reservation_extras GROUP BY 1,2) e ON e.tenant_id=r.tenant_id AND e.reservation_id=r.id
LEFT JOIN (SELECT tenant_id,reservation_id,sum(amount) total FROM public.hotel_reservation_payments GROUP BY 1,2) p ON p.tenant_id=r.tenant_id AND p.reservation_id=r.id;
GRANT SELECT ON public.hotel_reservation_balances TO authenticated,service_role;
