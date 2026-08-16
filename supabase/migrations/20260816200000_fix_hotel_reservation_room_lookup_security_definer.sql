-- Fix: Réceptionniste could not create reservations ("Logement introuvable
-- pour cet établissement") even for rooms in their own établissement.
--
-- Root cause: validate_hotel_reservation_availability() does
-- `SELECT ... FOR KEY SHARE` on hotel_rooms without SECURITY DEFINER. Postgres
-- RLS requires a row to also pass the table's UPDATE policy for any locking
-- read (FOR KEY SHARE included), not just the SELECT policy. Réceptionniste
-- only holds hotel.rooms.view (not hotel.rooms.update), so the lock silently
-- returned zero rows and the trigger raised "Logement introuvable", while
-- Administrateur (who holds every hotel.* permission) was unaffected.
--
-- Fix: mark the trigger SECURITY DEFINER, matching every sibling trigger in
-- 20260803150000_secure_hotel_reservations.sql (set_authenticated_hotel_tenant,
-- enforce_hotel_reservation_transition, etc). Tenant isolation is unaffected:
-- resolved_tenant_id is still derived from the authenticated caller's own
-- tenant (hotel_tenant_id(), itself SECURITY DEFINER and scoped to auth.uid()),
-- and the WHERE clause still filters by that tenant. No permission was added
-- to the Réceptionniste role; the room lookup itself is what is corrected.
CREATE OR REPLACE FUNCTION public.validate_hotel_reservation_availability() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE room_status text;
DECLARE resolved_tenant_id uuid;
BEGIN
 resolved_tenant_id := COALESCE(NEW.tenant_id, public.hotel_tenant_id());
 IF resolved_tenant_id IS NULL THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Tenant authentifié introuvable';
 END IF;
 NEW.tenant_id := resolved_tenant_id;
 SELECT status INTO room_status FROM public.hotel_rooms
 WHERE id=NEW.room_id AND tenant_id=resolved_tenant_id FOR KEY SHARE;
 IF room_status IS NULL THEN RAISE EXCEPTION USING ERRCODE='23503',MESSAGE='Logement introuvable pour cet établissement'; END IF;
 IF room_status IN ('maintenance','out_of_service') AND NEW.status IN ('pending','confirmed','checked_in') THEN
  RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='Ce logement est en maintenance et ne peut pas être réservé';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_hotel_reservation_availability() FROM PUBLIC,anon,authenticated;
