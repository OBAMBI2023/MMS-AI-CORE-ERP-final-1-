-- Migration additive pour la logique de fin de séjour du module Hôtel
-- Ajoute et sécurise le statut 'completed' et la libération automatique des logements.

-- 1. Mise à jour de la contrainte CHECK sur le statut des réservations hôtel pour inclure 'completed'
DO $$ BEGIN
  ALTER TABLE public.hotel_reservations
    DROP CONSTRAINT IF EXISTS hotel_reservations_status_check;
  
  ALTER TABLE public.hotel_reservations
    ADD CONSTRAINT hotel_reservations_status_check
    CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'completed', 'cancelled', 'no_show'));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 2. Garantir la protection contre les doubles réservations pour les seuls statuts bloquants: pending, confirmed, checked_in
ALTER TABLE public.hotel_reservations
  DROP CONSTRAINT IF EXISTS hotel_reservations_no_overlap;

ALTER TABLE public.hotel_reservations
  ADD CONSTRAINT hotel_reservations_no_overlap
  EXCLUDE USING gist (
    tenant_id WITH =,
    room_id WITH =,
    daterange(check_in, check_out, '[)') WITH &&
  )
  WHERE (status IN ('pending', 'confirmed', 'checked_in'));

-- 3. Fonction de validation de chevauchement SQL (bloque uniquement pending, confirmed, checked_in)
CREATE OR REPLACE FUNCTION public.validate_hotel_reservation_overlap() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
DECLARE conflicting_check_in date;
DECLARE conflicting_check_out date;
BEGIN
  IF NEW.status NOT IN ('pending', 'confirmed', 'checked_in') THEN RETURN NEW; END IF;
  SELECT reservation.check_in, reservation.check_out
    INTO conflicting_check_in, conflicting_check_out
  FROM public.hotel_reservations reservation
  WHERE reservation.tenant_id=NEW.tenant_id AND reservation.room_id=NEW.room_id
    AND reservation.id<>NEW.id
    AND reservation.status IN ('pending', 'confirmed', 'checked_in')
    AND NEW.check_in<reservation.check_out AND NEW.check_out>reservation.check_in
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION USING ERRCODE='23P01', CONSTRAINT='hotel_reservations_no_overlap',
      MESSAGE=format('Cette chambre est déjà réservée du %s au %s.', conflicting_check_in, conflicting_check_out);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS validate_hotel_reservation_overlap ON public.hotel_reservations;
CREATE TRIGGER validate_hotel_reservation_overlap
BEFORE INSERT OR UPDATE OF tenant_id,room_id,check_in,check_out,status
ON public.hotel_reservations FOR EACH ROW EXECUTE FUNCTION public.validate_hotel_reservation_overlap();

-- 4. Adaptateur de permission pour les transitions de statut
CREATE OR REPLACE FUNCTION public.enforce_hotel_reservation_transition() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF auth.uid() IS NULL THEN RETURN NEW; END IF;
 IF NEW.status='checked_in' AND NOT public.hotel_permission_for(OLD.tenant_id,'hotel_reservations','hotel.reservations.check_in') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Permission check-in requise'; END IF;
 IF NEW.status IN ('checked_out','completed') AND NOT public.hotel_permission_for(OLD.tenant_id,'hotel_reservations','hotel.reservations.check_out') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Permission check-out requise'; END IF;
 IF NEW.status='cancelled' AND NOT public.hotel_permission_for(OLD.tenant_id,'hotel_reservations','hotel.reservations.cancel') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Permission d''annulation requise'; END IF;
 RETURN NEW;
END $$;

-- 5. Synchronisation automatique des statuts opérationnels des chambres
CREATE OR REPLACE FUNCTION public.refresh_hotel_operational_statuses() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 UPDATE public.hotel_rooms room SET
  status=CASE WHEN EXISTS(SELECT 1 FROM public.hotel_reservations r WHERE r.tenant_id=room.tenant_id AND r.room_id=room.id AND r.status='checked_in' AND r.check_in<=CURRENT_DATE AND r.check_out>CURRENT_DATE) THEN 'occupied' ELSE 'available' END,
  updated_at=now()
 WHERE room.status NOT IN ('maintenance','out_of_service','cleaning') AND (
  (room.status<>'occupied' AND EXISTS(SELECT 1 FROM public.hotel_reservations r WHERE r.tenant_id=room.tenant_id AND r.room_id=room.id AND r.status='checked_in' AND r.check_in<=CURRENT_DATE AND r.check_out>CURRENT_DATE))
  OR (room.status='occupied' AND NOT EXISTS(SELECT 1 FROM public.hotel_reservations r WHERE r.tenant_id=room.tenant_id AND r.room_id=room.id AND r.status='checked_in' AND r.check_in<=CURRENT_DATE AND r.check_out>CURRENT_DATE))
 );
END $$;

SELECT public.refresh_hotel_operational_statuses();
