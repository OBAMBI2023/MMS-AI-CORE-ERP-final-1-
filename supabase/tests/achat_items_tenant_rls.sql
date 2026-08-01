BEGIN;

DO $$
DECLARE
  policy_count integer;
  command_count integer;
  trigger_definition text;
BEGIN
  SELECT count(*), count(DISTINCT cmd)
    INTO policy_count, command_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'achat_items'
    AND roles = ARRAY['authenticated']::name[]
    AND qual IS DISTINCT FROM 'true'
    AND with_check IS DISTINCT FROM 'true';

  IF policy_count <> 4 OR command_count <> 4 THEN
    RAISE EXCEPTION 'achat_items doit avoir quatre policies tenant dédiées';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'achat_items'
      AND ('anon' = ANY (roles) OR 'public' = ANY (roles))
  ) THEN
    RAISE EXCEPTION 'anon/public possède encore une policy sur achat_items';
  END IF;

  SELECT pg_get_triggerdef(oid)
    INTO trigger_definition
  FROM pg_trigger
  WHERE tgrelid = 'public.achat_items'::regclass
    AND tgname = 'trg_achat_items_parent_tenant'
    AND NOT tgisinternal;

  IF trigger_definition IS NULL THEN
    RAISE EXCEPTION 'trigger de validation achat_id/tenant_id absent';
  END IF;

  IF has_function_privilege('anon', 'public.current_tenant_id()', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon ne doit pas pouvoir résoudre un tenant courant';
  END IF;
END
$$;

ROLLBACK;
