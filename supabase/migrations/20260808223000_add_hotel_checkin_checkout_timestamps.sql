-- Ajoute l'horodatage réel d'arrivée et de départ pour le module Check-in / Check-out.
-- Additive uniquement : aucune table ni colonne existante n'est modifiée ou supprimée.

ALTER TABLE public.hotel_reservations
  ADD COLUMN IF NOT EXISTS actual_check_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS actual_check_out_at timestamptz;

-- La vue de calcul des soldes doit exposer les deux nouvelles colonnes.
CREATE OR REPLACE VIEW public.hotel_reservation_balances WITH (security_invoker=true) AS
SELECT r.id,r.tenant_id,r.guest_id,r.room_id,r.check_in,r.check_out,r.nightly_rate,r.discount,r.status,r.notes,
  r.created_at,r.updated_at,r.nights,r.accommodation_total,
  COALESCE(e.total,0) extras_total, COALESCE(p.total,0) paid_total,
  r.accommodation_total+COALESCE(e.total,0) grand_total,
  r.accommodation_total+COALESCE(e.total,0)-COALESCE(p.total,0) balance_due,
  r.actual_check_in_at,r.actual_check_out_at
FROM public.hotel_reservations r
LEFT JOIN (SELECT tenant_id,reservation_id,sum(quantity*unit_price) total FROM public.hotel_reservation_extras GROUP BY 1,2) e ON e.tenant_id=r.tenant_id AND e.reservation_id=r.id
LEFT JOIN (SELECT tenant_id,reservation_id,sum(amount) total FROM public.hotel_reservation_payments GROUP BY 1,2) p ON p.tenant_id=r.tenant_id AND p.reservation_id=r.id;
GRANT SELECT ON public.hotel_reservation_balances TO authenticated,service_role;
