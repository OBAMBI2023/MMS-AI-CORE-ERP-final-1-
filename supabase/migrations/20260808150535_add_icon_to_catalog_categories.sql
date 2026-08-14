ALTER TABLE public.catalog_categories
  ADD COLUMN icon text NULL;

COMMENT ON COLUMN public.catalog_categories.icon IS
  'Stable icon identifier (e.g. utensils, shirt, smartphone) selected from the app''s icon picker. NULL means no icon chosen; rendered as name-only.';;
