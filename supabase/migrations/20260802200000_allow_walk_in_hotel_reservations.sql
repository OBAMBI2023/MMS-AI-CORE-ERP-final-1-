-- A walk-in reservation has no guest record. Existing foreign-key and tenant
-- isolation rules continue to apply whenever guest_id is populated.
ALTER TABLE public.hotel_reservations
  ALTER COLUMN guest_id DROP NOT NULL;
