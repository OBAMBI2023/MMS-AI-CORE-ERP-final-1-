-- Migration additive : Intégrité stricte des réservations et occupation des chambres
-- Sécurise la synchronisation entre statuts de réservations et occupation réelle.

-- 1. Trigger pour synchroniser l'occupation réelle du logement
CREATE OR REPLACE FUNCTION public.sync_hotel_room_occupancy() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
    target_room_id uuid;
    is_occupied boolean;
BEGIN
    -- Déterminer les IDs des chambres à vérifier (ancienne et nouvelle)
    IF (TG_OP = 'DELETE') THEN
        target_room_id := OLD.room_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.room_id != NEW.room_id THEN
            -- Recalculer les deux chambres séparément en cas de changement
            PERFORM public.recalculate_room_status(OLD.room_id, OLD.tenant_id);
            target_room_id := NEW.room_id;
        ELSE
            target_room_id := NEW.room_id;
        END IF;
    ELSE
        target_room_id := NEW.room_id;
    END IF;

    -- Recalculer le statut pour la chambre cible
    PERFORM public.recalculate_room_status(target_room_id, COALESCE(NEW.tenant_id, OLD.tenant_id));
    
    RETURN NULL;
END $$;

-- 2. Fonction de recalcul du statut (Logic core)
CREATE OR REPLACE FUNCTION public.recalculate_room_status(r_id uuid, t_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
    is_occupied boolean;
BEGIN
    -- Règle 6 & 7 : Occupé si checked_in active, sinon available
    -- Respecte l'isolation multi-tenant (règle 1)
    SELECT EXISTS (
        SELECT 1 FROM public.hotel_reservations
        WHERE room_id = r_id
          AND tenant_id = t_id
          AND status = 'checked_in'
          AND CURRENT_DATE >= check_in
          AND CURRENT_DATE < check_out
    ) INTO is_occupied;

    IF is_occupied THEN
        UPDATE public.hotel_rooms
        SET status = 'occupied', updated_at = now()
        WHERE id = r_id AND tenant_id = t_id;
    ELSE
        UPDATE public.hotel_rooms
        SET status = 'available', updated_at = now()
        WHERE id = r_id AND tenant_id = t_id
          AND status NOT IN ('maintenance', 'out_of_service', 'cleaning');
    END IF;
END $$;

-- 3. Appliquer le trigger
DROP TRIGGER IF EXISTS trg_sync_hotel_room_occupancy ON public.hotel_reservations;
CREATE TRIGGER trg_sync_hotel_room_occupancy
AFTER INSERT OR UPDATE OR DELETE ON public.hotel_reservations
FOR EACH ROW EXECUTE FUNCTION public.sync_hotel_room_occupancy();

-- 4. Initialisation des statuts actuels
SELECT public.recalculate_room_status(id, tenant_id) FROM public.hotel_rooms;
