-- Restrict the sensitive Clients/Fournisseurs registers without changing
-- tenant ownership, existing rows, or any unrelated ERP module.

INSERT INTO public.permissions (code, description)
VALUES (
  'parties.access',
  'Accéder aux clients et fournisseurs, y compris les exports et impressions'
)
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;

-- Managers and tenant owners are structurally authorized. Keeping the RBAC
-- assignment as well makes the permission matrix accurately reflect access.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.roles role
CROSS JOIN public.permissions permission
WHERE role.name IN ('Administrateur', 'Manager', 'Gérant')
  AND permission.code = 'parties.access'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- An accountant is authorized only when an administrator explicitly enables
-- parties.access. No secondary role may retain that sensitive permission.
DELETE FROM public.role_permissions role_permission
USING public.roles role, public.permissions permission
WHERE role_permission.role_id = role.id
  AND role_permission.permission_id = permission.id
  AND permission.code = 'parties.access'
  AND role.name NOT IN ('Administrateur', 'Manager', 'Gérant', 'Comptable');

CREATE OR REPLACE FUNCTION public.current_user_can_access_parties()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles profile
    JOIN public.roles role
      ON role.id = profile.role_id
     AND role.tenant_id = profile.tenant_id
    WHERE profile.id = auth.uid()
      AND profile.tenant_id = public.current_tenant_id()
      AND (
        role.name IN ('Administrateur', 'Manager', 'Gérant')
        OR (
          role.name = 'Comptable'
          AND EXISTS (
            SELECT 1
            FROM public.role_permissions role_permission
            JOIN public.permissions permission
              ON permission.id = role_permission.permission_id
            WHERE role_permission.role_id = role.id
              AND permission.code = 'parties.access'
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_can_access_parties() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_can_access_parties()
  TO authenticated, service_role;

DROP POLICY IF EXISTS "public rw clients" ON public.clients;
DROP POLICY IF EXISTS "tenant isolation clients" ON public.clients;
DROP POLICY IF EXISTS "authorized parties clients" ON public.clients;
CREATE POLICY "authorized parties clients"
  ON public.clients
  FOR ALL
  TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_user_can_access_parties()
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.current_user_can_access_parties()
  );

DROP POLICY IF EXISTS "public rw fournisseurs" ON public.fournisseurs;
DROP POLICY IF EXISTS "tenant isolation fournisseurs" ON public.fournisseurs;
DROP POLICY IF EXISTS "authorized parties fournisseurs" ON public.fournisseurs;
CREATE POLICY "authorized parties fournisseurs"
  ON public.fournisseurs
  FOR ALL
  TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_user_can_access_parties()
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.current_user_can_access_parties()
  );

-- global_search is SECURITY DEFINER, so it must repeat both tenant and role
-- checks instead of relying on the caller's table policies.
CREATE OR REPLACE FUNCTION public.global_search(search_query text)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  module text,
  url text,
  icon text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name,
         COALESCE(c.phone, '') || ' ' || COALESCE(c.email, ''),
         'Clients', '/clients', 'user'
  FROM public.clients c
  WHERE c.tenant_id = public.current_tenant_id()
    AND public.current_user_can_access_parties()
    AND (
      c.name ILIKE '%' || search_query || '%'
      OR c.phone ILIKE '%' || search_query || '%'
      OR c.email ILIKE '%' || search_query || '%'
      OR c.address ILIKE '%' || search_query || '%'
      OR c.notes ILIKE '%' || search_query || '%'
    )

  UNION ALL

  SELECT f.id, f.name,
         COALESCE(f.phone, '') || ' ' || COALESCE(f.email, ''),
         'Fournisseurs', '/fournisseurs', 'building'
  FROM public.fournisseurs f
  WHERE f.tenant_id = public.current_tenant_id()
    AND public.current_user_can_access_parties()
    AND (
      f.name ILIKE '%' || search_query || '%'
      OR f.phone ILIKE '%' || search_query || '%'
      OR f.email ILIKE '%' || search_query || '%'
      OR f.address ILIKE '%' || search_query || '%'
      OR f.notes ILIKE '%' || search_query || '%'
    )

  UNION ALL

  SELECT s.id, s.name, s.category, 'Services', '/services', 'briefcase'
  FROM public.services s
  WHERE s.tenant_id = public.current_tenant_id()
    AND (s.name ILIKE '%' || search_query || '%' OR s.category ILIKE '%' || search_query || '%')

  UNION ALL

  SELECT v.id, v.number, COALESCE(v.client_name, ''), 'Ventes', '/ventes', 'receipt'
  FROM public.ventes v
  WHERE v.tenant_id = public.current_tenant_id()
    AND (v.number ILIKE '%' || search_query || '%' OR v.client_name ILIKE '%' || search_query || '%')

  UNION ALL

  SELECT a.id, a.number, COALESCE(a.fournisseur_name, ''), 'Achats', '/achats', 'shopping-cart'
  FROM public.achats a
  WHERE a.tenant_id = public.current_tenant_id()
    AND (a.number ILIKE '%' || search_query || '%' OR a.fournisseur_name ILIKE '%' || search_query || '%')

  UNION ALL

  SELECT d.id, d.description, d.category, 'Charges', '/depenses', 'credit-card'
  FROM public.depenses d
  WHERE d.tenant_id = public.current_tenant_id()
    AND (d.description ILIKE '%' || search_query || '%' OR d.category ILIKE '%' || search_query || '%')

  UNION ALL

  SELECT de.id, de.number, COALESCE(de.client_name, ''), 'Devis', '/devis', 'file-text'
  FROM public.devis de
  WHERE de.tenant_id = public.current_tenant_id()
    AND (de.number ILIKE '%' || search_query || '%' OR de.client_name ILIKE '%' || search_query || '%')

  UNION ALL

  SELECT p.id, p.company_name, 'Paramètres de l''entreprise',
         'Paramètres', '/parametres', 'settings'
  FROM public.parametres p
  WHERE p.tenant_id = public.current_tenant_id()
    AND p.company_name ILIKE '%' || search_query || '%';
END;
$$;

REVOKE ALL ON FUNCTION public.global_search(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.global_search(text) TO authenticated, service_role;
