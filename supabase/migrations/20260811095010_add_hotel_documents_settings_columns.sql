-- Additive, backward-compatible configuration for the Hotel Settings > Documents
-- sub-tab: which assets (logo/signature/stamp) appear on generated PDFs, a
-- per-document-type numbering prefix (cosmetic only — hotel document "numbers"
-- are derived client-side from a UUID slice, no DB sequence/unique constraint
-- exists to conflict with), and a free-text document footer. Defaults exactly
-- preserve current behavior (all three assets shown, existing hardcoded
-- prefixes FACT/REC/CONF/CERT, no footer text) so no existing tenant sees any
-- change until they explicitly edit these settings.
--
-- Deliberately NOT wired into the PDF generators yet (src/lib/mms/hotel-*-pdf.ts)
-- — this migration only adds storage for the settings UI to read/write.

ALTER TABLE public.hotel_settings
  ADD COLUMN IF NOT EXISTS show_logo_on_documents boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_signature_on_documents boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_stamp_on_documents boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS invoice_prefix text NOT NULL DEFAULT 'FACT',
  ADD COLUMN IF NOT EXISTS receipt_prefix text NOT NULL DEFAULT 'REC',
  ADD COLUMN IF NOT EXISTS confirmation_prefix text NOT NULL DEFAULT 'CONF',
  ADD COLUMN IF NOT EXISTS certificate_prefix text NOT NULL DEFAULT 'CERT',
  ADD COLUMN IF NOT EXISTS document_footer_text text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.hotel_settings'::regclass
      AND conname = 'hotel_settings_document_footer_text_length_check'
  ) THEN
    ALTER TABLE public.hotel_settings
      ADD CONSTRAINT hotel_settings_document_footer_text_length_check
      CHECK (document_footer_text IS NULL OR char_length(document_footer_text) <= 300);
  END IF;
END
$$;

-- No RLS/permission changes needed: hotel_settings already restricts
-- SELECT/UPDATE via hotel.settings.view/hotel.settings.update through
-- existing tenant-scoped policies (20260802140000_harden_hotel_rls_permissions.sql).
-- New columns inherit those same row-level policies automatically.
;
