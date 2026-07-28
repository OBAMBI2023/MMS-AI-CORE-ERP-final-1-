CREATE TABLE public.module_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  code text NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9][a-z0-9_-]{1,49}$'),
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.module_pack_items (
  pack_id uuid NOT NULL REFERENCES public.module_packs(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.erp_modules(id) ON DELETE CASCADE,
  PRIMARY KEY (pack_id, module_id)
);

CREATE TABLE public.tenant_module_packs (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  pack_id uuid NOT NULL REFERENCES public.module_packs(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX module_pack_items_module_id_idx ON public.module_pack_items(module_id);
CREATE INDEX tenant_module_packs_pack_id_idx ON public.tenant_module_packs(pack_id);

ALTER TABLE public.module_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_pack_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_module_packs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.module_packs, public.module_pack_items, public.tenant_module_packs
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.module_packs, public.module_pack_items, public.tenant_module_packs
  TO service_role;

INSERT INTO public.module_packs (name, code, description)
VALUES
  ('Commerce', 'commerce', 'Modules essentiels pour la gestion commerciale.'),
  ('Services', 'services', 'Modules adaptés aux entreprises de services.'),
  ('Restaurant', 'restaurant', 'Modules utiles à la gestion d''un restaurant.'),
  ('Complet', 'complet', 'Ensemble complet des modules ERP AUREX.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.module_pack_items (pack_id, module_id)
SELECT pack.id, module.id
FROM public.module_packs pack
JOIN public.erp_modules module ON (
  (pack.code = 'commerce' AND module.code IN (
    'dashboard', 'sales', 'products_services', 'customers', 'suppliers',
    'purchases', 'expenses', 'quotes', 'reports', 'inventory', 'settings', 'users'
  ))
  OR (pack.code = 'services' AND module.code IN (
    'dashboard', 'sales', 'products_services', 'customers', 'expenses',
    'quotes', 'reports', 'settings', 'users'
  ))
  OR (pack.code = 'restaurant' AND module.code IN (
    'dashboard', 'sales', 'products_services', 'customers', 'suppliers',
    'purchases', 'expenses', 'reports', 'inventory', 'settings', 'users'
  ))
  OR (pack.code = 'complet' AND module.code <> 'assistant_ai')
)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.manage_module_pack(
  requested_pack_id uuid,
  requested_name text,
  requested_code text,
  requested_description text,
  requested_is_active boolean,
  requested_module_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id uuid;
  normalized_code text := lower(btrim(requested_code));
BEGIN
  IF requested_name IS NULL OR char_length(btrim(requested_name)) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Nom de pack invalide';
  END IF;
  IF normalized_code !~ '^[a-z0-9][a-z0-9_-]{1,49}$' THEN
    RAISE EXCEPTION 'Code de pack invalide';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM unnest(coalesce(requested_module_ids, ARRAY[]::uuid[])) AS requested(module_id)
    WHERE NOT EXISTS (SELECT 1 FROM public.erp_modules m WHERE m.id = requested.module_id)
  ) THEN
    RAISE EXCEPTION 'Un module sélectionné est invalide';
  END IF;

  IF requested_pack_id IS NULL THEN
    INSERT INTO public.module_packs (name, code, description, is_active)
    VALUES (btrim(requested_name), normalized_code, nullif(btrim(requested_description), ''), requested_is_active)
    RETURNING id INTO target_id;
  ELSE
    UPDATE public.module_packs
    SET name = btrim(requested_name),
        code = normalized_code,
        description = nullif(btrim(requested_description), ''),
        is_active = requested_is_active,
        updated_at = now()
    WHERE id = requested_pack_id
    RETURNING id INTO target_id;
    IF target_id IS NULL THEN RAISE EXCEPTION 'Pack introuvable'; END IF;
  END IF;

  DELETE FROM public.module_pack_items WHERE pack_id = target_id;
  INSERT INTO public.module_pack_items (pack_id, module_id)
  SELECT target_id, requested.module_id
  FROM unnest(coalesce(requested_module_ids, ARRAY[]::uuid[])) AS requested(module_id)
  ON CONFLICT DO NOTHING;
  RETURN target_id;
END
$$;

CREATE OR REPLACE FUNCTION public.delete_module_pack(requested_pack_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.tenant_module_packs WHERE pack_id = requested_pack_id) THEN
    RAISE EXCEPTION 'Ce pack est attribué à au moins un tenant';
  END IF;
  DELETE FROM public.module_packs WHERE id = requested_pack_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pack introuvable'; END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.assign_module_pack_to_tenant(
  requested_tenant_id uuid,
  requested_pack_id uuid,
  requested_by uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = requested_tenant_id) THEN
    RAISE EXCEPTION 'Tenant introuvable';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.module_packs WHERE id = requested_pack_id AND is_active
  ) THEN
    RAISE EXCEPTION 'Pack actif introuvable';
  END IF;

  INSERT INTO public.tenant_module_packs (tenant_id, pack_id, assigned_at, assigned_by)
  VALUES (requested_tenant_id, requested_pack_id, now(), requested_by)
  ON CONFLICT (tenant_id) DO UPDATE
  SET pack_id = EXCLUDED.pack_id, assigned_at = now(), assigned_by = EXCLUDED.assigned_by;

  INSERT INTO public.tenant_modules (tenant_id, module_id, enabled)
  SELECT requested_tenant_id, module.id,
    EXISTS (
      SELECT 1 FROM public.module_pack_items item
      WHERE item.pack_id = requested_pack_id AND item.module_id = module.id
    )
  FROM public.erp_modules module
  ON CONFLICT (tenant_id, module_id) DO UPDATE SET enabled = EXCLUDED.enabled;
END
$$;

REVOKE ALL ON FUNCTION public.manage_module_pack(uuid, text, text, text, boolean, uuid[])
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_module_pack(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_module_pack_to_tenant(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_module_pack(uuid, text, text, text, boolean, uuid[]),
  public.delete_module_pack(uuid),
  public.assign_module_pack_to_tenant(uuid, uuid, uuid)
  TO service_role;
