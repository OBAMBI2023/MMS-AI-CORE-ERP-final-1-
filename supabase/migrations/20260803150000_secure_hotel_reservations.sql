-- Sécurise la disponibilité et automatise le cycle opérationnel Hôtel.
CREATE OR REPLACE FUNCTION public.validate_hotel_reservation_availability() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
DECLARE room_status text;
BEGIN
 SELECT status INTO room_status FROM public.hotel_rooms
 WHERE id=NEW.room_id AND tenant_id=NEW.tenant_id FOR KEY SHARE;
 IF room_status IS NULL THEN RAISE EXCEPTION USING ERRCODE='23503',MESSAGE='Logement introuvable pour cet établissement'; END IF;
 IF room_status IN ('maintenance','out_of_service') AND NEW.status IN ('pending','confirmed','checked_in') THEN
  RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='Ce logement est en maintenance et ne peut pas être réservé';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_hotel_reservation_availability ON public.hotel_reservations;
CREATE TRIGGER validate_hotel_reservation_availability BEFORE INSERT OR UPDATE OF tenant_id,room_id,status
ON public.hotel_reservations FOR EACH ROW EXECUTE FUNCTION public.validate_hotel_reservation_availability();

-- Les tâches internes n'ont pas de JWT ; les appels API gardent les permissions existantes.
CREATE OR REPLACE FUNCTION public.enforce_hotel_reservation_transition() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF auth.uid() IS NULL THEN RETURN NEW; END IF;
 IF NEW.status='checked_in' AND NOT public.hotel_permission_for(OLD.tenant_id,'hotel_reservations','hotel.reservations.check_in') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Permission check-in requise'; END IF;
 IF NEW.status='checked_out' AND NOT public.hotel_permission_for(OLD.tenant_id,'hotel_reservations','hotel.reservations.check_out') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Permission check-out requise'; END IF;
 IF NEW.status='cancelled' AND NOT public.hotel_permission_for(OLD.tenant_id,'hotel_reservations','hotel.reservations.cancel') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Permission d''annulation requise'; END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_hotel_operational_statuses() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 UPDATE public.hotel_reservations SET
  status=CASE WHEN check_out<=CURRENT_DATE THEN 'checked_out' WHEN check_in<=CURRENT_DATE THEN 'checked_in' ELSE 'confirmed' END,
  updated_at=now()
 WHERE status IN ('pending','confirmed','checked_in') AND status IS DISTINCT FROM
  CASE WHEN check_out<=CURRENT_DATE THEN 'checked_out' WHEN check_in<=CURRENT_DATE THEN 'checked_in' ELSE 'confirmed' END;

 UPDATE public.hotel_rooms room SET
  status=CASE WHEN EXISTS(SELECT 1 FROM public.hotel_reservations r WHERE r.tenant_id=room.tenant_id AND r.room_id=room.id AND r.status='checked_in' AND r.check_in<=CURRENT_DATE AND r.check_out>CURRENT_DATE) THEN 'occupied' ELSE 'cleaning' END,
  updated_at=now()
 WHERE room.status NOT IN ('maintenance','out_of_service','cleaning') AND (
  (room.status<>'occupied' AND EXISTS(SELECT 1 FROM public.hotel_reservations r WHERE r.tenant_id=room.tenant_id AND r.room_id=room.id AND r.status='checked_in' AND r.check_in<=CURRENT_DATE AND r.check_out>CURRENT_DATE))
  OR (room.status='occupied' AND NOT EXISTS(SELECT 1 FROM public.hotel_reservations r WHERE r.tenant_id=room.tenant_id AND r.room_id=room.id AND r.status='checked_in' AND r.check_in<=CURRENT_DATE AND r.check_out>CURRENT_DATE))
 );
END $$;

CREATE OR REPLACE FUNCTION public.sync_hotel_statuses_after_reservation_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF pg_trigger_depth()>1 THEN RETURN NULL; END IF;
 PERFORM public.refresh_hotel_operational_statuses(); RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS sync_hotel_statuses_after_reservation_change ON public.hotel_reservations;
CREATE TRIGGER sync_hotel_statuses_after_reservation_change AFTER INSERT OR UPDATE OR DELETE
ON public.hotel_reservations FOR EACH STATEMENT EXECUTE FUNCTION public.sync_hotel_statuses_after_reservation_change();

REVOKE ALL ON FUNCTION public.validate_hotel_reservation_availability(),public.refresh_hotel_operational_statuses(),public.sync_hotel_statuses_after_reservation_change() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_hotel_operational_statuses() TO service_role;

DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
  IF NOT EXISTS(SELECT 1 FROM cron.job WHERE jobname='refresh-hotel-operational-statuses') THEN
   PERFORM cron.schedule('refresh-hotel-operational-statuses','*/5 * * * *','SELECT public.refresh_hotel_operational_statuses()');
  END IF;
 END IF;
END $$;
SELECT public.refresh_hotel_operational_statuses();
