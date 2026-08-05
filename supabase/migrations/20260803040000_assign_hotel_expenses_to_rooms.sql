-- Optional Hôtel-only allocation of an expense to a room. Existing rows remain general.
ALTER TABLE public.depenses ADD COLUMN IF NOT EXISTS room_id uuid NULL;

CREATE INDEX IF NOT EXISTS idx_depenses_tenant_room
  ON public.depenses (tenant_id, room_id) WHERE room_id IS NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.depenses
    ADD CONSTRAINT depenses_room_id_tenant_id_fkey
    FOREIGN KEY (room_id, tenant_id)
    REFERENCES public.hotel_rooms (id, tenant_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Make the additive schema change visible to PostgREST immediately.
NOTIFY pgrst, 'reload schema';
