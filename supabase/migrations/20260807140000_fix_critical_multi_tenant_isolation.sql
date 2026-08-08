-- Critical multi-tenant isolation fixes (security audit, additive-only).
--
-- 1. public.v_rapport_mensuel aggregated ventes/achats/depenses across ALL
--    tenants (no security_invoker, no tenant filter) and was grantable to
--    anon/authenticated -> cross-tenant financial data leak.
-- 2. public.tg_handle_new_user() trusted the client-controlled
--    raw_user_meta_data->>'tenant_id' at signup to attach an ACTIVE profile
--    to an existing tenant -> tenant spoofing / unauthorized tenant join.
-- 3. The tenant-deletion pipeline (start_tenant_deletion,
--    delete_tenant_postgres_data[_core], finalize_tenant_deletion) checked
--    that requested_actor_id belonged to platform_admins but never that
--    requested_actor_id = auth.uid(), and EXECUTE was left grantable to
--    anon/authenticated -> actor-id spoofing could trigger irreversible
--    tenant deletion.

-- ============================================================
-- 1. v_rapport_mensuel: security_invoker + explicit per-source tenant scope
-- ============================================================
-- security_invoker=true alone would already make the view respect the
-- underlying tables' RLS (tenant_id = current_tenant_id()) for the caller,
-- but per the audit each aggregated source must also be explicitly scoped
-- so the view can never regress into a cross-tenant leak even if invoked in
-- a context where invoker semantics are bypassed.
CREATE OR REPLACE VIEW public.v_rapport_mensuel
WITH (security_invoker = true)
AS
SELECT
  date_trunc('month', months.mois)::date AS mois,
  COALESCE(v.total, 0::numeric) AS ventes_total,
  COALESCE(a.total, 0::numeric) AS achats_total,
  COALESCE(d.total, 0::numeric) AS depenses_total,
  COALESCE(v.total, 0::numeric) - COALESCE(a.total, 0::numeric) - COALESCE(d.total, 0::numeric) AS benefice
FROM (
  SELECT generate_series(
    date_trunc('month', now()) - '11 mons'::interval,
    date_trunc('month', now()),
    '1 mon'::interval
  ) AS mois
) months
LEFT JOIN (
  SELECT date_trunc('month', ventes.created_at) AS mois, sum(ventes.total) AS total
  FROM public.ventes
  WHERE ventes.tenant_id = public.current_tenant_id()
  GROUP BY date_trunc('month', ventes.created_at)
) v ON v.mois = date_trunc('month', months.mois)
LEFT JOIN (
  SELECT date_trunc('month', achats.created_at) AS mois, sum(achats.total) AS total
  FROM public.achats
  WHERE achats.tenant_id = public.current_tenant_id()
  GROUP BY date_trunc('month', achats.created_at)
) a ON a.mois = date_trunc('month', months.mois)
LEFT JOIN (
  SELECT date_trunc('month', depenses.paid_at::timestamp with time zone) AS mois, sum(depenses.amount) AS total
  FROM public.depenses
  WHERE depenses.tenant_id = public.current_tenant_id()
  GROUP BY date_trunc('month', depenses.paid_at::timestamp with time zone)
) d ON d.mois = date_trunc('month', months.mois)
ORDER BY (date_trunc('month', months.mois)::date);

REVOKE ALL ON public.v_rapport_mensuel FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_rapport_mensuel TO authenticated;

-- ============================================================
-- 2. tg_handle_new_user: never trust client-supplied tenant_id at signup
-- ============================================================
-- raw_user_meta_data is fully client-controlled (GoTrue persists whatever
-- "data"/"user_metadata" the caller of /auth/v1/signup or admin.createUser
-- supplies). Every new profile now starts unattached (tenant_id/role_id
-- NULL, which yields no current_tenant_id() and therefore no RLS access
-- anywhere) regardless of what metadata claims. Tenant assignment must
-- happen exclusively through a trusted server-side flow afterward:
--   - invited tenant creation (create_tenant_by_super_admin_invitation /
--     create_invited_tenant_atomic) already never puts tenant_id in the
--     signup metadata and attaches the tenant via its own service-role RPC;
--   - an existing tenant admin's createUser (user-management.server.ts)
--     already re-upserts the profile with a server-derived tenant_id/role_id
--     immediately after auth user creation, so it keeps working unchanged.
CREATE OR REPLACE FUNCTION public.tg_handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id, tenant_id, role_id, status, email, full_name, username
  )
  VALUES (
    new.id,
    NULL,
    NULL,
    'active',
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'username'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    username = COALESCE(public.profiles.username, EXCLUDED.username);

  RETURN new;
END;
$function$;

-- ============================================================
-- 3. Tenant-deletion pipeline: bind requested_actor_id to auth.uid()
--    and restrict EXECUTE to service_role (these are only ever called
--    from src/lib/tenant-deletion.server.ts via supabaseAdmin).
-- ============================================================
-- public.is_platform_admin_actor(uuid) already implements the correct,
-- vetted pattern used elsewhere in this codebase
-- (create_tenant_by_super_admin_invitation, create_invited_tenant_atomic):
-- it requires requested_actor_id = auth.uid() for a normal session, OR
-- (auth.uid() IS NULL AND auth.role() = 'service_role') for the service-role
-- server calls this pipeline actually uses, AND that the actor is a real
-- platform_admins row. Reusing it here closes the actor-spoofing gap
-- without breaking the service-role call path.

CREATE OR REPLACE FUNCTION public.start_tenant_deletion(requested_tenant_id uuid, requested_slug text, requested_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target public.tenants%ROWTYPE;
  job_id uuid;
  company_paths jsonb;
  target_users uuid[];
BEGIN
  IF NOT public.is_platform_admin_actor(requested_actor_id) THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.delete_tenant_postgres_data(requested_job_id uuid, requested_actor_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  job public.tenant_deletion_jobs%ROWTYPE;
BEGIN
  IF NOT public.is_platform_admin_actor(requested_actor_id) THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.delete_tenant_postgres_data_core(requested_job_id uuid, requested_actor_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  job public.tenant_deletion_jobs%ROWTYPE;
  candidate record;
  remaining_count bigint;
  table_count bigint;
  deleted_count bigint;
  progress boolean;
BEGIN
  IF NOT public.is_platform_admin_actor(requested_actor_id) THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.finalize_tenant_deletion(requested_job_id uuid, requested_actor_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  job public.tenant_deletion_jobs%ROWTYPE;
BEGIN
  IF NOT public.is_platform_admin_actor(requested_actor_id) THEN
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
$function$;

REVOKE ALL ON FUNCTION public.start_tenant_deletion(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_tenant_deletion(uuid, text, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.delete_tenant_postgres_data(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_tenant_postgres_data(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.delete_tenant_postgres_data_core(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_tenant_postgres_data_core(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.finalize_tenant_deletion(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_tenant_deletion(uuid, uuid) TO service_role;
