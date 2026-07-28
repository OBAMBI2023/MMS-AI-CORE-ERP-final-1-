-- Run after migrations. Validates trial profile configuration and RPC exposure.
BEGIN;

DO $$
DECLARE
  profile_code text;
BEGIN
  FOREACH profile_code IN ARRAY ARRAY['commerce', 'services', 'restaurant', 'general']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.trial_activity_profiles
      WHERE code = profile_code AND is_active
    ) THEN
      RAISE EXCEPTION 'Profil d''activité actif manquant: %', profile_code;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.trial_activity_profile_modules profile_module
      JOIN public.erp_modules module ON module.id = profile_module.module_id
      WHERE profile_module.profile_code = profile_code
        AND module.code = 'dashboard'
        AND module.is_active
    ) THEN
      RAISE EXCEPTION 'Module dashboard manquant pour le profil: %', profile_code;
    END IF;
  END LOOP;

  IF has_function_privilege(
    'authenticated',
    'public.create_partner_trial(text,text,text,text,text,text,uuid,uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'authenticated ne doit pas exécuter create_partner_trial';
  END IF;

  IF NOT has_function_privilege(
    'service_role',
    'public.create_partner_trial(text,text,text,text,text,text,uuid,uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'service_role doit exécuter create_partner_trial';
  END IF;
END;
$$;

ROLLBACK;
