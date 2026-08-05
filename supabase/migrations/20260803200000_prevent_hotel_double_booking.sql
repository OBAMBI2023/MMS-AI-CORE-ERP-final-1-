-- Protection additive et transactionnelle contre les doubles reservations.
-- La plage [arrivee, depart) autorise une nouvelle arrivee le jour du depart.
CREATE EXTENSION IF NOT EXISTS btree_gist;

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

REVOKE ALL ON FUNCTION public.validate_hotel_reservation_overlap() FROM PUBLIC,anon,authenticated;
