ALTER TABLE public.tenant_deletion_jobs
  DROP CONSTRAINT IF EXISTS tenant_deletion_jobs_requested_by_fkey;

ALTER FUNCTION public.delete_tenant_postgres_data(uuid, uuid)
  RENAME TO delete_tenant_postgres_data_core;

CREATE OR REPLACE FUNCTION public.delete_tenant_postgres_data(
  requested_job_id uuid,
  requested_actor_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job public.tenant_deletion_jobs%ROWTYPE;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_admins WHERE user_id = requested_actor_id
  ) THEN
    RAISE EXCEPTION 'Accès refusé : super administrateur requis.';
  END IF;

  SELECT * INTO job
  FROM public.tenant_deletion_jobs
  WHERE id = requested_job_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tâche de suppression introuvable.'; END IF;
  IF job.status = 'completed' THEN RETURN; END IF;

  -- Retain platform audit rows without keeping a FK that blocks Auth deletion.
  UPDATE public.audit_logs
  SET user_id = NULL
  WHERE user_id = ANY(job.auth_user_ids);

  PERFORM public.delete_tenant_postgres_data_core(requested_job_id, requested_actor_id);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_tenant_postgres_data(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_tenant_postgres_data(uuid, uuid) TO service_role;
REVOKE ALL ON FUNCTION public.delete_tenant_postgres_data_core(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_tenant_postgres_data_core(uuid, uuid) TO service_role;
