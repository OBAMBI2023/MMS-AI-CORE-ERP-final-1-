-- Complete the requested Super Admin activation for RESIDENCE DAMAJA after
-- the generic consistency repair. Existing subscription and usage data stay intact.
UPDATE public.tenant_ai_subscriptions subscription
SET status = 'active',
    activated_at = COALESCE(subscription.activated_at, now()),
    current_period_start = CASE
      WHEN subscription.current_period_end <= now() THEN now()
      ELSE subscription.current_period_start
    END,
    current_period_end = CASE
      WHEN subscription.current_period_end <= now() THEN now() + interval '1 month'
      ELSE subscription.current_period_end
    END,
    expires_at = CASE
      WHEN subscription.expires_at IS NOT NULL AND subscription.expires_at <= now() THEN NULL
      ELSE subscription.expires_at
    END,
    updated_at = now()
FROM public.tenants tenant
WHERE tenant.id = subscription.tenant_id
  AND upper(trim(tenant.name)) = 'RESIDENCE DAMAJA';

UPDATE public.tenant_modules assignment
SET enabled = true,
    assignment_source = 'subscription',
    updated_at = now()
FROM public.tenants tenant, public.erp_modules module
WHERE tenant.id = assignment.tenant_id
  AND module.id = assignment.module_id
  AND upper(trim(tenant.name)) = 'RESIDENCE DAMAJA'
  AND module.code = 'ai_assistant'
  AND EXISTS (
    SELECT 1
    FROM public.tenant_ai_subscriptions subscription
    WHERE subscription.tenant_id = tenant.id
      AND subscription.status IN ('active', 'trial')
      AND (subscription.expires_at IS NULL OR subscription.expires_at > now())
  );
