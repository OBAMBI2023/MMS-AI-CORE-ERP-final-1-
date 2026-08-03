-- Treat tenant/module key changes as removal of the previous assignment.

CREATE OR REPLACE FUNCTION public.enforce_active_premium_tenant_module()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_has_active_subscription boolean := false;
  new_has_active_subscription boolean := false;
BEGIN
  IF TG_OP = 'DELETE' THEN
    old_has_active_subscription := public.tenant_has_active_premium_subscription(
      OLD.tenant_id,
      OLD.module_id
    );

    IF OLD.enabled AND old_has_active_subscription THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Ce module possède un abonnement actif. Suspendez ou annulez l’abonnement avant de le supprimer.';
    END IF;

    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE'
    AND (
      OLD.tenant_id IS DISTINCT FROM NEW.tenant_id
      OR OLD.module_id IS DISTINCT FROM NEW.module_id
    )
  THEN
    old_has_active_subscription := public.tenant_has_active_premium_subscription(
      OLD.tenant_id,
      OLD.module_id
    );

    IF OLD.enabled AND old_has_active_subscription THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Ce module possède un abonnement actif. Suspendez ou annulez l’abonnement avant de modifier son affectation.';
    END IF;
  END IF;

  new_has_active_subscription := public.tenant_has_active_premium_subscription(
    NEW.tenant_id,
    NEW.module_id
  );

  IF NOT new_has_active_subscription THEN
    RETURN NEW;
  END IF;

  IF NOT NEW.enabled THEN
    IF TG_OP = 'INSERT' OR OLD.enabled THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Ce module possède un abonnement actif. Suspendez ou annulez l’abonnement avant de le désactiver.';
    END IF;

    -- Repair an already inconsistent disabled assignment on unrelated updates.
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
