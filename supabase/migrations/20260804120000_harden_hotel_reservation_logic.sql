-- Migration additive pour corriger la faille de sécurité des réservations hôtel.
-- Interdiction des états terminaux sur des séjours futurs et renforcement des transitions.

-- 1. Ajout d'une fonction de validation métier stricte.
CREATE OR REPLACE FUNCTION public.enforce_strict_hotel_reservation_logic() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
DECLARE
    previous_status text;
BEGIN
    -- Récupération du statut précédent (si UPDATE)
    IF TG_OP = 'UPDATE' THEN
        previous_status := OLD.status;
    END IF;

    -- A. Interdiction création directe ou modification vers des états finaux avec dates futures
    IF NEW.status IN ('completed', 'checked_out') AND NEW.check_in > CURRENT_DATE THEN
        RAISE EXCEPTION 'Impossible de terminer un séjour qui n''a pas encore commencé.';
    END IF;

    -- B. Vérification des transitions autorisées
    IF TG_OP = 'UPDATE' AND previous_status IS DISTINCT FROM NEW.status THEN
        -- Interdiction création directe en completed/checked_out (déjà couvert par INSERT, mais ajouté ici)
        IF previous_status IS NULL AND NEW.status IN ('completed', 'checked_out') THEN
            RAISE EXCEPTION 'Une réservation doit commencer par pending ou confirmed.';
        END IF;

        -- Interdiction transitions non conformes
        IF previous_status = 'pending' AND NEW.status = 'completed' THEN
            RAISE EXCEPTION 'Transition pending -> completed interdite.';
        END IF;

        IF previous_status = 'confirmed' AND NEW.status = 'completed' THEN
            RAISE EXCEPTION 'Transition confirmed -> completed sans check-in interdite.';
        END IF;

        IF previous_status IN ('pending', 'confirmed') AND NEW.status = 'checked_out' THEN
            RAISE EXCEPTION 'Transition vers checked_out nécessite un check-in préalable.';
        END IF;

        -- Check-in requis avant sortie
        IF NEW.status IN ('checked_out', 'completed') AND previous_status <> 'checked_in' THEN
             RAISE EXCEPTION 'Seule une réservation ayant été checked_in peut passer à checked_out ou completed.';
        END IF;
    END IF;

    -- C. Interdiction insertion directe en états terminaux
    IF TG_OP = 'INSERT' AND NEW.status IN ('completed', 'checked_out', 'checked_in') THEN
        RAISE EXCEPTION 'Une nouvelle réservation doit uniquement pouvoir être créée en pending ou confirmed.';
    END IF;

    RETURN NEW;
END $$;

-- 2. Application du trigger
DROP TRIGGER IF EXISTS enforce_strict_hotel_reservation_logic ON public.hotel_reservations;
CREATE TRIGGER enforce_strict_hotel_reservation_logic
BEFORE INSERT OR UPDATE ON public.hotel_reservations
FOR EACH ROW EXECUTE FUNCTION public.enforce_strict_hotel_reservation_logic();
