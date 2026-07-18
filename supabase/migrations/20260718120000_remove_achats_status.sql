-- Remove status from achats table

-- 1. Drop the constraint if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'achats_status_valid' AND conrelid = 'public.achats'::regclass) THEN
    ALTER TABLE public.achats DROP CONSTRAINT achats_status_valid;
  END IF;
END $$;

-- 2. Drop the index if it exists
DROP INDEX IF EXISTS idx_achats_status;

-- 3. Drop the column if it exists
ALTER TABLE public.achats DROP COLUMN IF EXISTS status;
