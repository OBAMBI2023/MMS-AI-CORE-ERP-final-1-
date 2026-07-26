-- Run after migrations. Any failed assertion aborts the transaction.
BEGIN;

DO $$
DECLARE
  first_tenant_id uuid;
  second_tenant_id uuid;
  first_slug text := public.normalize_tenant_slug('SAFARI DES SAVEURS');
  second_slug text;
BEGIN
  IF first_slug <> 'safari-des-saveurs' THEN
    RAISE EXCEPTION 'Slug inattendu pour SAFARI DES SAVEURS: %', first_slug;
  END IF;

  INSERT INTO public.tenants (name, slug)
  VALUES ('SAFARI DES SAVEURS', first_slug)
  RETURNING id INTO first_tenant_id;

  BEGIN
    INSERT INTO public.tenants (name, slug)
    VALUES ('SAFARI DES SAVEURS', first_slug);
    RAISE EXCEPTION 'La contrainte unique sur tenants.slug est absente';
  EXCEPTION
    WHEN unique_violation THEN
      second_slug := first_slug || '-2';
  END;

  INSERT INTO public.tenants (name, slug)
  VALUES ('SAFARI DES SAVEURS', second_slug)
  RETURNING id INTO second_tenant_id;

  IF first_tenant_id = second_tenant_id OR second_slug <> 'safari-des-saveurs-2' THEN
    RAISE EXCEPTION 'Le suffixe unique du slug est incorrect';
  END IF;
END;
$$;

ROLLBACK;
