-- Additive only: exposes two more fields already implied by the hotel_settings
-- table's purpose (Général: fuseau horaire, Réservations: conditions de réservation).
-- No existing column, policy or table is modified.
ALTER TABLE public.hotel_settings
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Africa/Abidjan',
  ADD COLUMN IF NOT EXISTS booking_terms text;
;
