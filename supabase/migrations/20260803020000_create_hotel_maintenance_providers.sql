-- Annuaire des prestataires de maintenance du pack Hôtel.
INSERT INTO public.erp_modules(code, name, description, icon, sort_order, is_active)
VALUES ('hotel_maintenance', 'Prestataires', 'Prestataires de maintenance', 'Wrench', 125, true)
ON CONFLICT(code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description,
  icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO public.module_pack_items(pack_id, module_id)
SELECT p.id, m.id FROM public.module_packs p CROSS JOIN public.erp_modules m
WHERE p.code = 'hotel' AND m.code = 'hotel_maintenance'
ON CONFLICT DO NOTHING;

INSERT INTO public.tenant_modules(tenant_id, module_id, enabled)
SELECT t.id, m.id, true FROM public.tenants t CROSS JOIN public.erp_modules m
WHERE t.platform_type = 'HOTEL' AND m.code = 'hotel_maintenance'
ON CONFLICT(tenant_id, module_id) DO NOTHING;

INSERT INTO public.permissions(code, description) VALUES
  ('hotel.maintenance.view', 'Voir les prestataires Hôtel'),
  ('hotel.maintenance.create', 'Ajouter des prestataires Hôtel'),
  ('hotel.maintenance.update', 'Modifier ou supprimer des prestataires Hôtel')
ON CONFLICT(code) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM public.roles r CROSS JOIN public.permissions p
WHERE r.name IN ('Administrateur', 'Gérant', 'Manager') AND p.code LIKE 'hotel.maintenance.%'
ON CONFLICT DO NOTHING;

CREATE TABLE public.hotel_maintenance_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (btrim(full_name) <> ''),
  company_name text,
  trade text NOT NULL CHECK (btrim(trade) <> ''),
  phone text NOT NULL CHECK (btrim(phone) <> ''),
  whatsapp text,
  intervention_area text,
  availability_status text NOT NULL DEFAULT 'available'
    CHECK (availability_status IN ('available', 'busy', 'unavailable')),
  internal_note text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX hotel_maintenance_providers_tenant_id_idx
  ON public.hotel_maintenance_providers(tenant_id);

ALTER TABLE public.hotel_maintenance_providers ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_maintenance_providers TO authenticated;

CREATE TRIGGER set_hotel_provider_tenant
BEFORE INSERT OR UPDATE ON public.hotel_maintenance_providers
FOR EACH ROW EXECUTE FUNCTION public.set_authenticated_hotel_tenant();

CREATE POLICY hotel_maintenance_select ON public.hotel_maintenance_providers
FOR SELECT TO authenticated
USING (public.hotel_permission_for(tenant_id, 'hotel_maintenance', 'hotel.maintenance.view'));

CREATE POLICY hotel_maintenance_insert ON public.hotel_maintenance_providers
FOR INSERT TO authenticated
WITH CHECK (public.hotel_permission_for(tenant_id, 'hotel_maintenance', 'hotel.maintenance.create'));

CREATE POLICY hotel_maintenance_update ON public.hotel_maintenance_providers
FOR UPDATE TO authenticated
USING (public.hotel_permission_for(tenant_id, 'hotel_maintenance', 'hotel.maintenance.update'))
WITH CHECK (public.hotel_permission_for(tenant_id, 'hotel_maintenance', 'hotel.maintenance.update'));

CREATE POLICY hotel_maintenance_delete ON public.hotel_maintenance_providers
FOR DELETE TO authenticated
USING (public.hotel_permission_for(tenant_id, 'hotel_maintenance', 'hotel.maintenance.update'));

CREATE OR REPLACE FUNCTION public.touch_hotel_maintenance_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END
$$;

CREATE TRIGGER touch_hotel_provider_updated_at
BEFORE UPDATE ON public.hotel_maintenance_providers
FOR EACH ROW EXECUTE FUNCTION public.touch_hotel_maintenance_updated_at();

REVOKE ALL ON FUNCTION public.touch_hotel_maintenance_updated_at() FROM PUBLIC, anon, authenticated;

-- Force PostgREST to reload the schema after the new relation is committed.
NOTIFY pgrst, 'reload schema';
