-- Additive RBAC hardening for every HOTEL table and operation.
INSERT INTO public.permissions(code,description) VALUES
('hotel.reservations.view','Voir les réservations Hôtel'),('hotel.reservations.create','Créer des réservations Hôtel'),
('hotel.reservations.update','Modifier des réservations Hôtel'),('hotel.reservations.delete','Supprimer des réservations Hôtel'),
('hotel.reservations.check_in','Effectuer un check-in'),('hotel.reservations.check_out','Effectuer un check-out'),
('hotel.reservations.cancel','Annuler une réservation'),('hotel.rooms.view','Voir les chambres'),
('hotel.rooms.create','Créer des chambres'),('hotel.rooms.update','Modifier des chambres'),('hotel.rooms.delete','Supprimer des chambres'),
('hotel.guests.view','Voir les voyageurs'),('hotel.guests.create','Créer des voyageurs'),
('hotel.guests.update','Modifier des voyageurs'),('hotel.guests.delete','Supprimer des voyageurs'),
('hotel.guests.identity_view','Voir les pièces d''identité des voyageurs'),
('hotel.expenses.view','Voir les dépenses Hôtel'),('hotel.expenses.create','Créer des dépenses Hôtel'),
('hotel.expenses.update','Modifier des dépenses Hôtel'),('hotel.expenses.delete','Supprimer des dépenses Hôtel'),
('hotel.reports.view','Voir les rapports Hôtel'),('hotel.reports.export','Exporter les rapports Hôtel'),
('hotel.settings.view','Voir les paramètres Hôtel'),('hotel.settings.update','Modifier les paramètres Hôtel')
ON CONFLICT(code) DO UPDATE SET description=EXCLUDED.description;

ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS roles_tenant_role_name_check;
ALTER TABLE public.roles ADD CONSTRAINT roles_tenant_role_name_check CHECK(name IN(
 'Administrateur','Gérant','Réceptionniste','Manager','Comptable','Commercial','Caissier','Employé'));
INSERT INTO public.roles(tenant_id,name,description)
SELECT id,'Réceptionniste','Réservations, voyageurs et accueil Hôtel' FROM public.tenants WHERE platform_type='HOTEL'
ON CONFLICT(tenant_id,name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.validate_profile_role_tenant() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE selected_role public.roles%ROWTYPE;
BEGIN
 IF TG_OP='UPDATE' AND auth.uid()=OLD.id AND (NEW.role_id IS DISTINCT FROM OLD.role_id OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Un utilisateur ne peut pas modifier son propre rôle ou tenant_id';
 END IF;
 IF NEW.role_id IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO selected_role FROM public.roles WHERE id=NEW.role_id;
 IF NOT FOUND OR selected_role.tenant_id IS DISTINCT FROM NEW.tenant_id OR selected_role.name NOT IN(
  'Administrateur','Gérant','Réceptionniste','Manager','Comptable','Commercial','Caissier','Employé') THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Attribution de rôle refusée';
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.create_hotel_reception_role() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE reception_role_id uuid;
BEGIN
 IF NEW.platform_type<>'HOTEL' THEN RETURN NEW; END IF;
 INSERT INTO public.roles(tenant_id,name,description) VALUES(NEW.id,'Réceptionniste','Réservations, voyageurs et accueil Hôtel')
 ON CONFLICT(tenant_id,name) DO UPDATE SET description=EXCLUDED.description RETURNING id INTO reception_role_id;
 INSERT INTO public.role_permissions(role_id,permission_id)
 SELECT reception_role_id,id FROM public.permissions WHERE code LIKE 'hotel.reservations.%' OR code LIKE 'hotel.guests.%' OR code='hotel.rooms.view'
 ON CONFLICT DO NOTHING;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS create_hotel_reception_role ON public.tenants;
CREATE TRIGGER create_hotel_reception_role AFTER INSERT OR UPDATE OF platform_type ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.create_hotel_reception_role();
REVOKE ALL ON FUNCTION public.create_hotel_reception_role() FROM PUBLIC,anon,authenticated;

-- Standard tenant roles receive only their documented HOTEL capabilities.
INSERT INTO public.role_permissions(role_id,permission_id)
SELECT role.id,permission.id FROM public.roles role CROSS JOIN public.permissions permission
WHERE
 (role.name='Administrateur' AND permission.code LIKE 'hotel.%') OR
 (role.name='Gérant' AND permission.code LIKE 'hotel.%') OR
 (role.name='Réceptionniste' AND (permission.code LIKE 'hotel.reservations.%' OR permission.code LIKE 'hotel.guests.%' OR permission.code='hotel.rooms.view')) OR
 (role.name='Comptable' AND (permission.code LIKE 'hotel.expenses.%' OR permission.code LIKE 'hotel.reports.%' OR permission.code='hotel.reservations.view'))
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.hotel_permission_for(target_tenant uuid,module_code text,permission_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT target_tenant=public.hotel_tenant_id()
   AND EXISTS(SELECT 1 FROM public.tenants t WHERE t.id=target_tenant AND t.platform_type='HOTEL' AND t.is_active AND t.deleted_at IS NULL)
   AND public.current_user_module_enabled(module_code)
   AND public.has_permission(permission_code)
   AND (permission_code<>'hotel.guests.identity_view' OR public.has_permission('hotel.guests.view'))
$$;
REVOKE ALL ON FUNCTION public.hotel_permission_for(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hotel_permission_for(uuid,text,text) TO authenticated,service_role;

-- Reject cross-tenant INSERTs and tenant_id mutation instead of silently rewriting them.
CREATE OR REPLACE FUNCTION public.set_authenticated_hotel_tenant() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE current_id uuid:=public.hotel_tenant_id();
BEGIN
 IF auth.uid() IS NULL THEN RETURN NEW; END IF;
 IF current_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Tenant authentifié introuvable'; END IF;
 IF TG_OP='UPDATE' AND NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='La modification de tenant_id est interdite';
 END IF;
 IF TG_OP='INSERT' AND NEW.tenant_id IS NOT NULL AND NEW.tenant_id IS DISTINCT FROM current_id THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Insertion inter-tenant interdite';
 END IF;
 NEW.tenant_id:=current_id;
 RETURN NEW;
END $$;

-- Replace the former FOR ALL policy with operation-specific permissions.
DO $$ DECLARE row record; BEGIN
 FOR row IN SELECT * FROM (VALUES
  ('hotel_room_types','hotel_rooms','hotel.rooms.view','hotel.rooms.create','hotel.rooms.update','hotel.rooms.delete'),
  ('hotel_rooms','hotel_rooms','hotel.rooms.view','hotel.rooms.create','hotel.rooms.update','hotel.rooms.delete'),
  ('hotel_guests','hotel_guests','hotel.guests.identity_view','hotel.guests.create','hotel.guests.update','hotel.guests.delete'),
  ('hotel_reservations','hotel_reservations','hotel.reservations.view','hotel.reservations.create','hotel.reservations.update','hotel.reservations.delete'),
  ('hotel_reservation_extras','hotel_reservations','hotel.reservations.view','hotel.reservations.update','hotel.reservations.update','hotel.reservations.delete'),
  ('hotel_reservation_payments','hotel_reservations','hotel.reservations.view','hotel.reservations.update','hotel.reservations.update','hotel.reservations.delete'),
  ('hotel_guest_companions','hotel_guests','hotel.guests.identity_view','hotel.guests.create','hotel.guests.update','hotel.guests.delete'),
  ('hotel_settings','hotel_settings','hotel.settings.view','hotel.settings.update','hotel.settings.update','hotel.settings.__delete_forbidden')
 ) AS rules(table_name,module_code,select_permission,insert_permission,update_permission,delete_permission)
 LOOP
  EXECUTE format('DROP POLICY IF EXISTS hotel_tenant_access ON public.%I',row.table_name);
  EXECUTE format('DROP POLICY IF EXISTS hotel_select_permission ON public.%I',row.table_name);
  EXECUTE format('DROP POLICY IF EXISTS hotel_insert_permission ON public.%I',row.table_name);
  EXECUTE format('DROP POLICY IF EXISTS hotel_update_permission ON public.%I',row.table_name);
  EXECUTE format('DROP POLICY IF EXISTS hotel_delete_permission ON public.%I',row.table_name);
  EXECUTE format('CREATE POLICY hotel_select_permission ON public.%I FOR SELECT TO authenticated USING (public.hotel_permission_for(tenant_id,%L,%L))',row.table_name,row.module_code,row.select_permission);
  EXECUTE format('CREATE POLICY hotel_insert_permission ON public.%I FOR INSERT TO authenticated WITH CHECK (public.hotel_permission_for(tenant_id,%L,%L))',row.table_name,row.module_code,row.insert_permission);
  EXECUTE format('CREATE POLICY hotel_update_permission ON public.%I FOR UPDATE TO authenticated USING (public.hotel_permission_for(tenant_id,%L,%L)) WITH CHECK (public.hotel_permission_for(tenant_id,%L,%L))',row.table_name,row.module_code,row.update_permission,row.module_code,row.update_permission);
  EXECUTE format('CREATE POLICY hotel_delete_permission ON public.%I FOR DELETE TO authenticated USING (public.hotel_permission_for(tenant_id,%L,%L))',row.table_name,row.module_code,row.delete_permission);
 END LOOP;
END $$;

-- Status transitions require their dedicated permission in addition to update.
CREATE OR REPLACE FUNCTION public.enforce_hotel_reservation_transition() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.status IS DISTINCT FROM OLD.status THEN
  IF NEW.status='checked_in' AND NOT public.hotel_permission_for(OLD.tenant_id,'hotel_reservations','hotel.reservations.check_in') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Permission check-in requise'; END IF;
  IF NEW.status='checked_out' AND NOT public.hotel_permission_for(OLD.tenant_id,'hotel_reservations','hotel.reservations.check_out') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Permission check-out requise'; END IF;
  IF NEW.status='cancelled' AND NOT public.hotel_permission_for(OLD.tenant_id,'hotel_reservations','hotel.reservations.cancel') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Permission d''annulation requise'; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS enforce_hotel_reservation_transition ON public.hotel_reservations;
CREATE TRIGGER enforce_hotel_reservation_transition BEFORE UPDATE OF status ON public.hotel_reservations
FOR EACH ROW EXECUTE FUNCTION public.enforce_hotel_reservation_transition();
REVOKE ALL ON FUNCTION public.enforce_hotel_reservation_transition() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.protect_hotel_guest_identity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF (TG_OP='INSERT' AND (NEW.identity_type IS NOT NULL OR NEW.identity_number IS NOT NULL OR NEW.identity_document_path IS NOT NULL))
 OR (TG_OP='UPDATE' AND (NEW.identity_type IS DISTINCT FROM OLD.identity_type OR NEW.identity_number IS DISTINCT FROM OLD.identity_number OR NEW.identity_document_path IS DISTINCT FROM OLD.identity_document_path)) THEN
  IF NOT public.hotel_permission_for(NEW.tenant_id,'hotel_guests','hotel.guests.identity_view') THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Permission pièces d''identité requise';
  END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_hotel_guest_identity ON public.hotel_guests;
CREATE TRIGGER protect_hotel_guest_identity BEFORE INSERT OR UPDATE OF identity_type,identity_number,identity_document_path ON public.hotel_guests
FOR EACH ROW EXECUTE FUNCTION public.protect_hotel_guest_identity();
REVOKE ALL ON FUNCTION public.protect_hotel_guest_identity() FROM PUBLIC,anon,authenticated;

-- Shared expenses retain existing ERP behaviour; HOTEL rows require HOTEL RBAC.
DROP POLICY IF EXISTS "tenant isolation depenses" ON public.depenses;
DROP POLICY IF EXISTS hotel_expenses_select ON public.depenses;
DROP POLICY IF EXISTS hotel_expenses_insert ON public.depenses;
DROP POLICY IF EXISTS hotel_expenses_update ON public.depenses;
DROP POLICY IF EXISTS hotel_expenses_delete ON public.depenses;
CREATE POLICY hotel_expenses_select ON public.depenses FOR SELECT TO authenticated USING(
 (tenant_id=public.current_tenant_id() AND NOT EXISTS(SELECT 1 FROM public.tenants t WHERE t.id=tenant_id AND t.platform_type='HOTEL')) OR public.hotel_permission_for(tenant_id,'expenses','hotel.expenses.view'));
CREATE POLICY hotel_expenses_insert ON public.depenses FOR INSERT TO authenticated WITH CHECK(
 (tenant_id=public.current_tenant_id() AND NOT EXISTS(SELECT 1 FROM public.tenants t WHERE t.id=tenant_id AND t.platform_type='HOTEL')) OR public.hotel_permission_for(tenant_id,'expenses','hotel.expenses.create'));
CREATE POLICY hotel_expenses_update ON public.depenses FOR UPDATE TO authenticated USING(public.hotel_permission_for(tenant_id,'expenses','hotel.expenses.update') OR (tenant_id=public.current_tenant_id() AND NOT EXISTS(SELECT 1 FROM public.tenants t WHERE t.id=tenant_id AND t.platform_type='HOTEL'))) WITH CHECK(public.hotel_permission_for(tenant_id,'expenses','hotel.expenses.update') OR (tenant_id=public.current_tenant_id() AND NOT EXISTS(SELECT 1 FROM public.tenants t WHERE t.id=tenant_id AND t.platform_type='HOTEL')));
CREATE POLICY hotel_expenses_delete ON public.depenses FOR DELETE TO authenticated USING(public.hotel_permission_for(tenant_id,'expenses','hotel.expenses.delete') OR (tenant_id=public.current_tenant_id() AND NOT EXISTS(SELECT 1 FROM public.tenants t WHERE t.id=tenant_id AND t.platform_type='HOTEL')));
