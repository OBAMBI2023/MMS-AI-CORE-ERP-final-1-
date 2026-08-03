-- Keep Assistant IA present in the central catalogue and make its assignment
-- state explicit for tenants created before this repair.
INSERT INTO public.erp_modules
  (code, name, description, icon, sort_order, is_active, module_type)
VALUES
  (
    'ai_assistant',
    'Assistant IA',
    'Analyses en lecture seule et actions ERP confirmées',
    'Bot',
    95,
    true,
    'premium'
  )
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    is_active = true,
    module_type = 'premium';

INSERT INTO public.tenant_modules
  (tenant_id, module_id, enabled, assignment_source, updated_at)
SELECT tenant.id,
       module.id,
       public.tenant_has_active_premium_subscription(tenant.id, module.id),
       CASE
         WHEN public.tenant_has_active_premium_subscription(tenant.id, module.id)
           THEN 'subscription'
         ELSE 'system'
       END,
       now()
FROM public.tenants tenant
CROSS JOIN public.erp_modules module
WHERE module.code = 'ai_assistant'
ON CONFLICT (tenant_id, module_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
