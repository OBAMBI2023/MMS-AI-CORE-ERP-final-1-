-- FiscalitÃ© becomes a first-class ERP module, wired through the same
-- erp_modules / tenant_modules / current_user_module_enabled path as the
-- existing business modules.

INSERT INTO public.erp_modules
  (code, name, description, icon, sort_order, is_active, module_type)
VALUES
  (
    'fiscalite',
    'FiscalitÃ©',
    'Anticipation des obligations fiscales',
    'Landmark',
    72,
    true,
    'standard'
  )
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    is_active = true,
    module_type = 'standard';

INSERT INTO public.tenant_modules
  (tenant_id, module_id, enabled, assignment_source, updated_at)
SELECT tenant.id,
       module.id,
       true,
       'system',
       now()
FROM public.tenants tenant
CROSS JOIN public.erp_modules module
WHERE module.code = 'fiscalite'
  AND COALESCE(tenant.deleted_at IS NULL, true)
  AND COALESCE(tenant.platform_type, 'ERP') = 'ERP'
ON CONFLICT (tenant_id, module_id) DO UPDATE
SET enabled = true,
    assignment_source = 'system',
    updated_at = now();

NOTIFY pgrst, 'reload schema';
