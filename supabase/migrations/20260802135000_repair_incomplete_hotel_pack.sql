-- Repair the partially applied 20260801213000_create_hotel_pack migration.
-- This migration is intentionally additive and safe to run more than once.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS platform_type text NOT NULL DEFAULT 'ERP';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.tenants'::regclass
      AND conname = 'tenants_platform_type_check'
  ) THEN
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_platform_type_check
      CHECK (platform_type IN ('ERP', 'HOTEL')) NOT VALID;
  END IF;
END
$$;

ALTER TABLE public.tenants
  VALIDATE CONSTRAINT tenants_platform_type_check;

CREATE OR REPLACE FUNCTION public.hotel_module_enabled(code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenants tenant
    WHERE tenant.id = public.hotel_tenant_id()
      AND tenant.platform_type = 'HOTEL'
  )
  AND public.current_user_module_enabled(code)
$$;

REVOKE ALL ON FUNCTION public.hotel_module_enabled(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hotel_module_enabled(text) TO authenticated, service_role;
