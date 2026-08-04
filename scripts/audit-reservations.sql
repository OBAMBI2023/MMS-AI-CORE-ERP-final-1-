-- Audit des réservations problématiques
SELECT id, tenant_id, room_id, check_in, check_out, status
FROM public.hotel_reservations
WHERE status IN ('completed', 'checked_out') AND check_in > CURRENT_DATE;
