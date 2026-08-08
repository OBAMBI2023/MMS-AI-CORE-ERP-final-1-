-- Additive, nullable profile fields for hotel_guests to support the
-- /hotel/clients module (nationality, client type, company name).
-- No new table: hotel_guests already serves as the hotel "clients" model
-- and is referenced by hotel_reservations.guest_id.
ALTER TABLE public.hotel_guests
  ADD COLUMN nationality text NULL,
  ADD COLUMN client_type text NULL DEFAULT 'individuel',
  ADD COLUMN company text NULL;

ALTER TABLE public.hotel_guests
  ADD CONSTRAINT hotel_guests_client_type_check
  CHECK (client_type IS NULL OR client_type IN ('individuel', 'entreprise', 'agence', 'comptoir'));

COMMENT ON COLUMN public.hotel_guests.nationality IS 'Guest nationality, free text (e.g. Ivoirienne, Française).';
COMMENT ON COLUMN public.hotel_guests.client_type IS 'individuel | entreprise | agence | comptoir. Defaults to individuel for existing rows.';
COMMENT ON COLUMN public.hotel_guests.company IS 'Company or agency name, relevant when client_type is entreprise or agence.';

-- DEFAULT only applies to future inserts; backfill existing rows explicitly.
UPDATE public.hotel_guests SET client_type = 'individuel' WHERE client_type IS NULL;
