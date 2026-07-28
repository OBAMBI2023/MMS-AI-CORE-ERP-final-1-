-- Store the tenant's free-form business sector independently from its legal
-- and trade names. Existing values are intentionally left untouched.
ALTER TABLE public.parametres
  ADD COLUMN IF NOT EXISTS business_sector text;

CREATE OR REPLACE FUNCTION public.clean_parametres_business_sector()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.business_sector IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.business_sector := NULLIF(
    btrim(regexp_replace(
      regexp_replace(NEW.business_sector, '[[:cntrl:]]', ' ', 'g'),
      '[[:space:]]+',
      ' ',
      'g'
    )),
    ''
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clean_parametres_business_sector ON public.parametres;
CREATE TRIGGER trg_clean_parametres_business_sector
BEFORE INSERT OR UPDATE OF business_sector ON public.parametres
FOR EACH ROW
EXECUTE FUNCTION public.clean_parametres_business_sector();

ALTER TABLE public.parametres
  DROP CONSTRAINT IF EXISTS parametres_business_sector_length_chk;

ALTER TABLE public.parametres
  ADD CONSTRAINT parametres_business_sector_length_chk
  CHECK (business_sector IS NULL OR char_length(business_sector) <= 100);
