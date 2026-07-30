CREATE TABLE public.tenant_deletion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  tenant_slug text NOT NULL,
  tenant_name text NOT NULL,
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'partial', 'failed', 'completed')),
  current_step text NOT NULL DEFAULT 'prevalidation'
    CHECK (current_step IN (
      'prevalidation', 'deactivation', 'storage', 'auth', 'postgres', 'finalization'
    )),
  steps jsonb NOT NULL DEFAULT '{}'::jsonb,
  storage_paths jsonb NOT NULL DEFAULT '{}'::jsonb,
  auth_user_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  attempt_count integer NOT NULL DEFAULT 0,
  lock_token uuid,
  locked_at timestamptz,
  last_error jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX tenant_deletion_jobs_one_active_per_tenant
  ON public.tenant_deletion_jobs (tenant_id)
  WHERE status <> 'completed';

CREATE INDEX tenant_deletion_jobs_created_at_idx
  ON public.tenant_deletion_jobs (created_at DESC);

ALTER TABLE public.tenant_deletion_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tenant_deletion_jobs FROM anon, authenticated;
GRANT ALL ON TABLE public.tenant_deletion_jobs TO service_role;

CREATE OR REPLACE FUNCTION public.start_tenant_deletion(
  requested_tenant_id uuid,
  requested_slug text,
  requested_actor_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target public.tenants%ROWTYPE;
  job_id uuid;
  company_paths jsonb;
  target_users uuid[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_admins WHERE user_id = requested_actor_id
  ) THEN
    RAISE EXCEPTION 'Accès refusé : super administrateur requis.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(requested_tenant_id::text, 0));
  SELECT * INTO target
  FROM public.tenants
  WHERE id = requested_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Tenant introuvable.'; END IF;
  IF target.slug IS DISTINCT FROM requested_slug THEN
    RAISE EXCEPTION 'Le slug de confirmation ne correspond pas.';
  END IF;

  SELECT id INTO job_id
  FROM public.tenant_deletion_jobs
  WHERE tenant_id = requested_tenant_id AND status <> 'completed'
  FOR UPDATE;
  IF job_id IS NOT NULL THEN RETURN job_id; END IF;

  SELECT coalesce(array_agg(id ORDER BY id), '{}'::uuid[])
  INTO target_users
  FROM public.profiles
  WHERE tenant_id = requested_tenant_id;

  SELECT coalesce(
    jsonb_build_object(
      'company-assets',
      to_jsonb(array_remove(ARRAY[logo_url, signature_url, stamp_url], NULL))
    ),
    '{"company-assets":[]}'::jsonb
  )
  INTO company_paths
  FROM public.parametres
  WHERE tenant_id = requested_tenant_id;

  INSERT INTO public.tenant_deletion_jobs (
    tenant_id, tenant_slug, tenant_name, requested_by, status, current_step,
    steps, storage_paths, auth_user_ids, started_at
  ) VALUES (
    target.id, target.slug, target.name, requested_actor_id, 'running', 'deactivation',
    jsonb_build_object(
      'prevalidation', jsonb_build_object('status', 'completed', 'at', now()),
      'deactivation', jsonb_build_object('status', 'pending'),
      'storage', jsonb_build_object('status', 'pending'),
      'postgres', jsonb_build_object('status', 'pending'),
      'auth', jsonb_build_object('status', 'pending'),
      'finalization', jsonb_build_object('status', 'pending')
    ),
    coalesce(company_paths, '{"company-assets":[]}'::jsonb),
    target_users,
    now()
  )
  RETURNING id INTO job_id;

  UPDATE public.tenants SET is_active = false WHERE id = target.id;

  INSERT INTO public.audit_logs (user_id, action, module, entity_id, metadata)
  VALUES (
    requested_actor_id,
    'Suppression définitive de tenant demandée',
    'super_admin_tenants',
    target.id::text,
    jsonb_build_object('job_id', job_id, 'tenant_id', target.id, 'tenant_slug', target.slug)
  );

  RETURN job_id;
END;
$$;

REVOKE ALL ON FUNCTION public.start_tenant_deletion(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_tenant_deletion(uuid, text, uuid) TO service_role;

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
  candidate record;
  remaining_count bigint;
  table_count bigint;
  deleted_count bigint;
  progress boolean;
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
  IF coalesce(job.steps #>> '{storage,status}', '') <> 'completed' THEN
    RAISE EXCEPTION 'L’étape Storage doit être terminée.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(job.tenant_id::text, 0));

  -- Preserve the platform audit while detaching references to tenant-owned roles.
  UPDATE public.audit_logs
  SET role_id = NULL
  WHERE role_id IN (SELECT id FROM public.roles WHERE tenant_id = job.tenant_id);

  -- Every public base table carrying tenant_id is constrained to this exact UUID.
  -- Repeated passes allow FK-dependent tenant tables to be emptied before parents.
  LOOP
    progress := false;
    FOR candidate IN
      SELECT c.table_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name
      WHERE c.table_schema = 'public'
        AND c.column_name = 'tenant_id'
        AND t.table_type = 'BASE TABLE'
        AND c.table_name NOT IN ('tenants', 'tenant_deletion_jobs')
      ORDER BY c.table_name
    LOOP
      BEGIN
        EXECUTE format('DELETE FROM public.%I WHERE tenant_id = $1', candidate.table_name)
        USING job.tenant_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        progress := progress OR deleted_count > 0;
      EXCEPTION WHEN foreign_key_violation THEN
        NULL;
      END;
    END LOOP;

    remaining_count := 0;
    FOR candidate IN
      SELECT c.table_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name
      WHERE c.table_schema = 'public'
        AND c.column_name = 'tenant_id'
        AND t.table_type = 'BASE TABLE'
        AND c.table_name NOT IN ('tenants', 'tenant_deletion_jobs')
    LOOP
      EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id = $1', candidate.table_name)
      INTO table_count USING job.tenant_id;
      remaining_count := remaining_count + table_count;
    END LOOP;

    EXIT WHEN remaining_count = 0;
    IF NOT progress THEN
      RAISE EXCEPTION 'Des dépendances PostgreSQL empêchent la suppression isolée du tenant.';
    END IF;
  END LOOP;

  DELETE FROM public.tenants WHERE id = job.tenant_id;
  IF NOT FOUND THEN
    -- Idempotent retry: absence is acceptable only for the snapshotted tenant.
    NULL;
  END IF;

  UPDATE public.tenant_deletion_jobs
  SET status = 'running',
      current_step = 'auth',
      steps = jsonb_set(steps, '{postgres}', jsonb_build_object('status', 'completed', 'at', now())),
      updated_at = now(),
      last_error = NULL
  WHERE id = job.id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_tenant_postgres_data(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_tenant_postgres_data(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.finalize_tenant_deletion(
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

  SELECT * INTO job FROM public.tenant_deletion_jobs
  WHERE id = requested_job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tâche de suppression introuvable.'; END IF;
  IF job.status = 'completed' THEN RETURN; END IF;
  IF coalesce(job.steps #>> '{postgres,status}', '') <> 'completed'
     OR coalesce(job.steps #>> '{auth,status}', '') <> 'completed' THEN
    RAISE EXCEPTION 'Les étapes PostgreSQL et Auth doivent être terminées.';
  END IF;

  UPDATE public.tenant_deletion_jobs
  SET status = 'completed',
      current_step = 'finalization',
      steps = jsonb_set(
        steps, '{finalization}', jsonb_build_object('status', 'completed', 'at', now())
      ),
      completed_at = now(),
      updated_at = now(),
      last_error = NULL
  WHERE id = job.id;

  INSERT INTO public.audit_logs (user_id, action, module, entity_id, metadata)
  VALUES (
    requested_actor_id,
    'Suppression définitive de tenant terminée',
    'super_admin_tenants',
    job.tenant_id::text,
    jsonb_build_object(
      'job_id', job.id, 'tenant_id', job.tenant_id,
      'tenant_slug', job.tenant_slug, 'tenant_name', job.tenant_name
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_tenant_deletion(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_tenant_deletion(uuid, uuid) TO service_role;
