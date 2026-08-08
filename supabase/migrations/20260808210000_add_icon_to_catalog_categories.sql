-- Additive, nullable icon identifier for catalog categories.
-- Stores a stable string id (e.g. "utensils", "shirt", "smartphone") chosen
-- from the app's built-in icon picker — never raw SVG/base64/JSX. NULL means
-- no icon was chosen; existing categories stay valid without any backfill.
ALTER TABLE public.catalog_categories
  ADD COLUMN icon text NULL;

COMMENT ON COLUMN public.catalog_categories.icon IS
  'Stable icon identifier (e.g. utensils, shirt, smartphone) selected from the app''s icon picker. NULL means no icon chosen; rendered as name-only.';
