-- Complete the tenant_modules boundary invariant by protecting DELETE paths.

CREATE OR REPLACE FUNCTION public.enforce_active_premium_tenant_module()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_tenant_id uuid;
  target_module_id uuid;
  has_active_subscription boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_tenant_id := OLD.tenant_id;
    target_module_id := OLD.module_id;
  ELSE
    target_tenant_id := NEW.tenant_id;
    target_module_id := NEW.module_id;
  END IF;

  has_active_subscription := public.tenant_has_active_premium_subscription(
    target_tenant_id,
    target_module_id
  );

  IF TG_OP = 'DELETE' THEN
    IF OLD.enabled AND has_active_subscription THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Ce module possède un abonnement actif. Suspendez ou annulez l’abonnement avant de le supprimer.';
    END IF;
    RETURN OLD;
  END IF;

  IF NOT has_active_subscription THEN
    RETURN NEW;
  END IF;

  IF NOT NEW.enabled THEN
    IF TG_OP = 'INSERT' OR OLD.enabled THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Ce module possède un abonnement actif. Suspendez ou annulez l’abonnement avant de le désactiver.';
    END IF;
    NEW.enabled := true;
  END IF;

  NEW.assignment_source := 'subscription';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_active_premium_tenant_module
  ON public.tenant_modules;
CREATE TRIGGER trg_enforce_active_premium_tenant_module
  BEFORE INSERT OR UPDATE OR DELETE ON public.tenant_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_active_premium_tenant_module();

NOTIFY pgrst, 'reload schema';
