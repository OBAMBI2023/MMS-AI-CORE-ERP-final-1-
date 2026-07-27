INSERT INTO public.erp_modules (code, name, description, icon, sort_order, is_active)
VALUES (
  'ai_assistant',
  'Assistant IA',
  'Analyses en lecture seule et actions ERP confirmées',
  'Bot',
  95,
  true
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

INSERT INTO public.permissions (code, description, module)
VALUES
  ('assistant.use', 'Utiliser l''assistant IA', 'ai_assistant'),
  ('clients.create', 'Créer un client', 'customers'),
  ('devis.create', 'Créer un devis', 'quotes'),
  ('factures.create', 'Créer une facture', 'sales'),
  ('depenses.create', 'Enregistrer une dépense', 'expenses'),
  ('products.create', 'Créer un produit', 'products_services')
ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description,
  module = EXCLUDED.module;

-- Administrators receive the new permissions. Other tenant roles remain opt-in.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.roles role
CROSS JOIN public.permissions permission
WHERE role.name = 'Administrateur'
  AND permission.code IN (
    'assistant.use', 'clients.create', 'devis.create', 'factures.create',
    'depenses.create', 'products.create'
  )
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.ai_assistant_pending_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN (
    'create_client', 'create_quote', 'create_invoice', 'create_expense',
    'create_product', 'enable_module'
  )),
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'cancelled', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  executed_at timestamptz
);

CREATE INDEX IF NOT EXISTS ai_pending_actions_owner_idx
  ON public.ai_assistant_pending_actions (tenant_id, user_id, status, created_at DESC);

ALTER TABLE public.ai_assistant_pending_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_assistant_pending_actions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.ai_assistant_pending_actions TO service_role;

-- The assistant is activable: it is not enabled automatically for existing or
-- future tenants. Tenant administrators enable it explicitly.
CREATE OR REPLACE FUNCTION public.assign_default_modules_to_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tenant_modules (tenant_id, module_id, enabled)
  SELECT NEW.id, module.id, true
  FROM public.erp_modules module
  WHERE module.is_active
    AND module.code <> 'ai_assistant'
  ON CONFLICT (tenant_id, module_id) DO NOTHING;
  RETURN NEW;
END
$$;

NOTIFY pgrst, 'reload schema';
