-- Remplace uniquement l'unicité globale historique par une unicité par tenant.
DO $$
DECLARE
  singleton_definition text;
BEGIN
  SELECT pg_get_constraintdef(oid)
    INTO singleton_definition
  FROM pg_constraint
  WHERE conname = 'parametres_singleton_uq'
    AND conrelid = 'public.parametres'::regclass
    AND contype = 'u';

  IF singleton_definition IS NOT NULL
     AND singleton_definition = 'UNIQUE (singleton)' THEN
    ALTER TABLE public.parametres
      DROP CONSTRAINT parametres_singleton_uq;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'parametres_tenant_id_uq'
      AND conrelid = 'public.parametres'::regclass
      AND contype = 'u'
  ) THEN
    ALTER TABLE public.parametres
      ADD CONSTRAINT parametres_tenant_id_uq UNIQUE (tenant_id);
  END IF;
END
$$;
