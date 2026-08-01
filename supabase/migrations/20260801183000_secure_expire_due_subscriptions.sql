-- Allow subscription expiry only to the platform service role or to an
-- authenticated platform administrator. This replaces the function in place;
-- it does not recreate, delete, or rewrite any subscription row.
CREATE OR REPLACE FUNCTION public.expire_due_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  affected_rows integer;
BEGIN
  IF auth.role() <> 'service_role'
     AND (
       auth.role() <> 'authenticated'
       OR auth.uid() IS NULL
       OR NOT EXISTS (
         SELECT 1
         FROM public.platform_admins AS administrator
         WHERE administrator.user_id = auth.uid()
       )
     )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Accès refusé : super administrateur de plateforme requis.';
  END IF;

  UPDATE public.subscriptions AS subscription
  SET status = 'expired'
  WHERE
    (subscription.status = 'trial' AND subscription.trial_ends_at <= pg_catalog.now())
    OR (
      subscription.status = 'active'
      AND subscription.ends_at IS NOT NULL
      AND subscription.ends_at <= pg_catalog.now()
    );

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_due_subscriptions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expire_due_subscriptions() TO authenticated, service_role;

