DO $$
BEGIN
  CREATE TYPE public.platform_role AS ENUM ('partner');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS public.platform_user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.platform_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.platform_user_roles (user_id, role)
SELECT user_id, 'partner'::public.platform_role
FROM public.partner_users
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

ALTER TABLE public.platform_user_roles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_user_roles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.platform_user_roles TO authenticated;
GRANT ALL ON public.platform_user_roles TO service_role;

CREATE POLICY "platform_user_roles_read_own"
  ON public.platform_user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.current_partner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT partner_user.partner_id
  FROM public.partner_users partner_user
  JOIN public.partners partner ON partner.id = partner_user.partner_id
  JOIN public.platform_user_roles platform_role
    ON platform_role.user_id = partner_user.user_id
   AND platform_role.role = 'partner'
  WHERE partner_user.user_id = auth.uid()
    AND partner.is_active
    AND NOT EXISTS (
      SELECT 1 FROM public.platform_admins
      WHERE platform_admins.user_id = auth.uid()
    )
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.partner_can_read_module(requested_module_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.partner_tenants assignment
    JOIN public.tenant_modules tenant_module
      ON tenant_module.tenant_id = assignment.tenant_id
    WHERE assignment.partner_id = public.current_partner_id()
      AND tenant_module.module_id = requested_module_id
      AND tenant_module.enabled
  )
$$;

REVOKE ALL ON FUNCTION public.partner_can_read_module(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.partner_can_read_module(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "erp_modules_read_partner_assigned" ON public.erp_modules;
CREATE POLICY "erp_modules_read_partner_assigned"
  ON public.erp_modules FOR SELECT TO authenticated
  USING (is_active AND public.partner_can_read_module(id));

GRANT SELECT ON public.module_packs, public.module_pack_items, public.tenant_module_packs
  TO authenticated;

CREATE POLICY "tenant_module_packs_read_assigned_partner"
  ON public.tenant_module_packs FOR SELECT TO authenticated
  USING (public.partner_can_read_tenant(tenant_id));

CREATE POLICY "module_packs_read_assigned_partner"
  ON public.module_packs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tenant_module_packs assignment
      WHERE assignment.pack_id = module_packs.id
        AND public.partner_can_read_tenant(assignment.tenant_id)
    )
  );

CREATE POLICY "module_pack_items_read_assigned_partner"
  ON public.module_pack_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tenant_module_packs assignment
      WHERE assignment.pack_id = module_pack_items.pack_id
        AND public.partner_can_read_tenant(assignment.tenant_id)
    )
  );

CREATE OR REPLACE FUNCTION public.create_partner_account(
  requested_partner_id uuid,
  requested_user_id uuid,
  requested_name text,
  requested_code text,
  requested_actor_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_partner_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = requested_actor_id) THEN
    RAISE EXCEPTION 'Platform Admin requis';
  END IF;
  IF requested_name IS NULL OR char_length(btrim(requested_name)) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'Nom partenaire invalide';
  END IF;
  IF requested_code !~ '^[a-z0-9][a-z0-9_-]{1,49}$' THEN
    RAISE EXCEPTION 'Code partenaire invalide';
  END IF;

  INSERT INTO public.partners (id, name, code, is_active)
  VALUES (requested_partner_id, btrim(requested_name), lower(requested_code), true)
  RETURNING id INTO created_partner_id;
  INSERT INTO public.partner_users (partner_id, user_id)
  VALUES (created_partner_id, requested_user_id);
  INSERT INTO public.platform_user_roles (user_id, role)
  VALUES (requested_user_id, 'partner');
  INSERT INTO public.partner_activity_logs (partner_id, user_id, action, metadata)
  VALUES (
    created_partner_id, requested_actor_id, 'partner.created',
    jsonb_build_object('partner_user_id', requested_user_id)
  );
  RETURN created_partner_id;
END
$$;

CREATE OR REPLACE FUNCTION public.update_partner_account(
  requested_partner_id uuid,
  requested_name text,
  requested_code text,
  requested_is_active boolean,
  requested_actor_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  was_active boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = requested_actor_id) THEN
    RAISE EXCEPTION 'Platform Admin requis';
  END IF;
  SELECT is_active INTO was_active
  FROM public.partners
  WHERE id = requested_partner_id
  FOR UPDATE;
  IF was_active IS NULL THEN RAISE EXCEPTION 'Partenaire introuvable'; END IF;

  UPDATE public.partners
  SET name = btrim(requested_name),
      code = lower(btrim(requested_code)),
      is_active = requested_is_active,
      updated_at = now()
  WHERE id = requested_partner_id;
  INSERT INTO public.partner_activity_logs (partner_id, user_id, action, metadata)
  VALUES (
    requested_partner_id, requested_actor_id, 'partner.updated',
    jsonb_build_object('is_active', requested_is_active)
  );
  IF was_active AND NOT requested_is_active THEN
    INSERT INTO public.partner_activity_logs (partner_id, user_id, action, metadata)
    VALUES (
      requested_partner_id, requested_actor_id, 'partner.suspended',
      jsonb_build_object('is_active', false)
    );
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.set_partner_tenants(
  requested_partner_id uuid,
  requested_tenant_ids uuid[],
  requested_actor_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tenant_record record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = requested_actor_id) THEN
    RAISE EXCEPTION 'Platform Admin requis';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.partners WHERE id = requested_partner_id) THEN
    RAISE EXCEPTION 'Partenaire introuvable';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM unnest(coalesce(requested_tenant_ids, ARRAY[]::uuid[])) AS requested(tenant_id)
    WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = requested.tenant_id)
  ) THEN
    RAISE EXCEPTION 'Tenant invalide';
  END IF;

  FOR tenant_record IN
    SELECT tenant_id FROM public.partner_tenants
    WHERE partner_id = requested_partner_id
      AND tenant_id <> ALL(coalesce(requested_tenant_ids, ARRAY[]::uuid[]))
  LOOP
    INSERT INTO public.partner_activity_logs (partner_id, user_id, action, tenant_id)
    VALUES (requested_partner_id, requested_actor_id, 'tenant.removed', tenant_record.tenant_id);
  END LOOP;

  FOR tenant_record IN
    SELECT requested.tenant_id
    FROM unnest(coalesce(requested_tenant_ids, ARRAY[]::uuid[])) AS requested(tenant_id)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.partner_tenants current_assignment
      WHERE current_assignment.partner_id = requested_partner_id
        AND current_assignment.tenant_id = requested.tenant_id
    )
  LOOP
    INSERT INTO public.partner_activity_logs (partner_id, user_id, action, tenant_id)
    VALUES (requested_partner_id, requested_actor_id, 'tenant.assigned', tenant_record.tenant_id);
  END LOOP;

  DELETE FROM public.partner_tenants
  WHERE partner_id = requested_partner_id
    AND tenant_id <> ALL(coalesce(requested_tenant_ids, ARRAY[]::uuid[]));
  INSERT INTO public.partner_tenants (partner_id, tenant_id)
  SELECT requested_partner_id, requested.tenant_id
  FROM unnest(coalesce(requested_tenant_ids, ARRAY[]::uuid[])) AS requested(tenant_id)
  ON CONFLICT DO NOTHING;
END
$$;

REVOKE ALL ON FUNCTION public.create_partner_account(uuid, uuid, text, text, uuid),
  public.update_partner_account(uuid, text, text, boolean, uuid),
  public.set_partner_tenants(uuid, uuid[], uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_partner_account(uuid, uuid, text, text, uuid),
  public.update_partner_account(uuid, text, text, boolean, uuid),
  public.set_partner_tenants(uuid, uuid[], uuid)
  TO service_role;
