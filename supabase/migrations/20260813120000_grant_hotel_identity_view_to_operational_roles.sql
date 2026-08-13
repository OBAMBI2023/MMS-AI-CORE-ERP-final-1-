-- Backfill HOTEL identity view for operational roles only.
-- Idempotent and safe to replay.

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.tenants t ON t.id = r.tenant_id
CROSS JOIN public.permissions p
WHERE t.platform_type = 'HOTEL'
  AND t.is_active = true
  AND t.deleted_at IS NULL
  AND r.name IN ('Manager', 'Réceptionniste')
  AND p.code = 'hotel.guests.identity_view'
ON CONFLICT DO NOTHING;
