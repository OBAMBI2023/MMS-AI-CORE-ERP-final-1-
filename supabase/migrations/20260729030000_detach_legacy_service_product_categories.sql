-- Legacy categories were migrated to product. Keep the denormalized service
-- category label for historical documents, but remove an incompatible foreign
-- key so future service updates are not rejected by the type guard.
ALTER TABLE public.services
  DISABLE TRIGGER trg_services_set_catalog_tenant;

UPDATE public.services item
SET category_id = NULL
FROM public.catalog_categories category
WHERE item.category_id = category.id
  AND item.tenant_id = category.tenant_id
  AND item.type = 'service'
  AND category.type = 'product';

ALTER TABLE public.services
  ENABLE TRIGGER trg_services_set_catalog_tenant;
