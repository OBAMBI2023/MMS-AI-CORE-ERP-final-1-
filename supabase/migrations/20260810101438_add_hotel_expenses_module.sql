-- Dedicated HOTEL "Dépenses" module — separate from the ERP depenses table,
-- reserved to platform_type='HOTEL' tenants. Mirrors the existing hotel_guests
-- pattern: server-enforced tenant_id (set_authenticated_hotel_tenant trigger,
-- generic and already deployed), RLS gated through hotel_permission_for()
-- and a private per-tenant storage bucket for optional receipts, following
-- the hotel-identity-documents bucket policy shape. Purely additive.

INSERT INTO public.erp_modules (code, name, icon, sort_order, is_active, module_type)
VALUES ('hotel_expenses', 'Dépenses Hôtel', 'Wallet', 126, true, 'standard')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.tenant_modules (tenant_id, module_id, enabled)
SELECT t.id, m.id, true
FROM public.tenants t
CROSS JOIN public.erp_modules m
WHERE m.code = 'hotel_expenses'
ON CONFLICT (tenant_id, module_id) DO NOTHING;

CREATE TABLE public.hotel_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL CHECK (btrim(category) <> ''),
  description text NOT NULL CHECK (btrim(description) <> ''),
  amount numeric(15,2) NOT NULL CHECK (amount >= 0),
  payment_method text,
  payee text,
  reference text,
  notes text,
  receipt_path text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX hotel_expenses_tenant_date_idx ON public.hotel_expenses (tenant_id, expense_date DESC);
CREATE INDEX hotel_expenses_tenant_category_idx ON public.hotel_expenses (tenant_id, category);

CREATE TRIGGER set_authenticated_hotel_tenant
  BEFORE INSERT OR UPDATE ON public.hotel_expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_authenticated_hotel_tenant();

CREATE TRIGGER trg_hotel_expenses_upd
  BEFORE UPDATE ON public.hotel_expenses
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.hotel_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY hotel_expenses_select_permission ON public.hotel_expenses
  FOR SELECT
  USING (public.hotel_permission_for(tenant_id, 'hotel_expenses', 'hotel.expenses.view'));

CREATE POLICY hotel_expenses_insert_permission ON public.hotel_expenses
  FOR INSERT
  WITH CHECK (public.hotel_permission_for(tenant_id, 'hotel_expenses', 'hotel.expenses.create'));

CREATE POLICY hotel_expenses_update_permission ON public.hotel_expenses
  FOR UPDATE
  USING (public.hotel_permission_for(tenant_id, 'hotel_expenses', 'hotel.expenses.update'))
  WITH CHECK (public.hotel_permission_for(tenant_id, 'hotel_expenses', 'hotel.expenses.update'));

CREATE POLICY hotel_expenses_delete_permission ON public.hotel_expenses
  FOR DELETE
  USING (public.hotel_permission_for(tenant_id, 'hotel_expenses', 'hotel.expenses.delete'));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hotel-expense-receipts',
  'hotel-expense-receipts',
  false,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "hotel expense receipts tenant insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'hotel-expense-receipts'
    AND (storage.foldername(name))[1] = (public.hotel_tenant_id())::text
    AND (storage.foldername(name))[2] = 'receipts'
    AND storage.filename(name) ~ '^[a-z0-9-]+\.(jpg|jpeg|png|webp|pdf)$'
    AND public.hotel_permission_for(public.hotel_tenant_id(), 'hotel_expenses', 'hotel.expenses.create')
  );

CREATE POLICY "hotel expense receipts tenant read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'hotel-expense-receipts'
    AND (storage.foldername(name))[1] = (public.hotel_tenant_id())::text
    AND (storage.foldername(name))[2] = 'receipts'
    AND public.hotel_permission_for(public.hotel_tenant_id(), 'hotel_expenses', 'hotel.expenses.view')
  );

CREATE POLICY "hotel expense receipts tenant update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'hotel-expense-receipts'
    AND (storage.foldername(name))[1] = (public.hotel_tenant_id())::text
    AND (storage.foldername(name))[2] = 'receipts'
    AND public.hotel_permission_for(public.hotel_tenant_id(), 'hotel_expenses', 'hotel.expenses.update')
  )
  WITH CHECK (
    bucket_id = 'hotel-expense-receipts'
    AND (storage.foldername(name))[1] = (public.hotel_tenant_id())::text
    AND (storage.foldername(name))[2] = 'receipts'
    AND public.hotel_permission_for(public.hotel_tenant_id(), 'hotel_expenses', 'hotel.expenses.update')
  );

CREATE POLICY "hotel expense receipts tenant delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'hotel-expense-receipts'
    AND (storage.foldername(name))[1] = (public.hotel_tenant_id())::text
    AND (storage.foldername(name))[2] = 'receipts'
    AND (
      public.hotel_permission_for(public.hotel_tenant_id(), 'hotel_expenses', 'hotel.expenses.update')
      OR public.hotel_permission_for(public.hotel_tenant_id(), 'hotel_expenses', 'hotel.expenses.delete')
    )
  );
;
