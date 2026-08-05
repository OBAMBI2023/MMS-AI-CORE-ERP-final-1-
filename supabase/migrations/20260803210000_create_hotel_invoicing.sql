-- Facturation Hotel: one tenant-scoped invoice per reservation, backed by the
-- existing reservations and payment ledger.
INSERT INTO public.erp_modules (code, name, description, icon, sort_order, is_active)
VALUES ('hotel_invoicing', 'Facturation Hotel', 'Factures, creances et encaissements Hotel', 'ReceiptText', 122, true)
ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description,
  icon=EXCLUDED.icon, sort_order=EXCLUDED.sort_order, is_active=true;

INSERT INTO public.module_pack_items (pack_id, module_id)
SELECT pack.id, module.id FROM public.module_packs pack CROSS JOIN public.erp_modules module
WHERE pack.code='hotel' AND module.code='hotel_invoicing'
ON CONFLICT DO NOTHING;

INSERT INTO public.tenant_modules(tenant_id,module_id,enabled,assignment_source)
SELECT tenant_pack.tenant_id,module.id,true,'pack'
FROM public.tenant_module_packs tenant_pack
JOIN public.module_packs pack ON pack.id=tenant_pack.pack_id AND pack.code='hotel'
JOIN public.erp_modules module ON module.code='hotel_invoicing'
ON CONFLICT(tenant_id,module_id) DO UPDATE SET enabled=true,assignment_source='pack',updated_at=now();

INSERT INTO public.permissions(code,description) VALUES
  ('hotel.invoices.view','Voir les factures Hotel'),
  ('hotel.invoices.create','Creer les factures Hotel'),
  ('hotel.invoices.collect','Enregistrer un versement Hotel'),
  ('hotel.invoices.export','Imprimer et exporter les factures Hotel')
ON CONFLICT(code) DO UPDATE SET description=EXCLUDED.description;

INSERT INTO public.role_permissions(role_id,permission_id)
SELECT role.id, permission.id FROM public.roles role CROSS JOIN public.permissions permission
WHERE permission.code LIKE 'hotel.invoices.%'
  AND role.name IN ('Administrateur','Gérant','Réceptionniste','Comptable')
ON CONFLICT DO NOTHING;

CREATE TABLE public.hotel_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  reservation_id uuid NOT NULL,
  number text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (tenant_id, number),
  UNIQUE (tenant_id, reservation_id),
  UNIQUE (id, tenant_id),
  FOREIGN KEY (reservation_id,tenant_id)
    REFERENCES public.hotel_reservations(id,tenant_id) ON DELETE RESTRICT
);

CREATE INDEX hotel_invoices_tenant_issued_idx
  ON public.hotel_invoices(tenant_id,issued_at DESC);

CREATE OR REPLACE FUNCTION public.assign_hotel_invoice_number() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE next_value bigint;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.tenant_id IS DISTINCT FROM public.hotel_tenant_id() THEN
      RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Insertion inter-tenant interdite';
    END IF;
    NEW.created_by:=auth.uid();
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.tenant_id::text || ':hotel-invoice',0));
  SELECT coalesce(max(nullif(substring(number from '([0-9]+)$'),'')::bigint),0)+1
    INTO next_value FROM public.hotel_invoices WHERE tenant_id=NEW.tenant_id;
  NEW.number:=coalesce(nullif(btrim(NEW.number),''),
    'FAC-' || to_char(coalesce(NEW.issued_at,now()),'YYYY') || '-' || lpad(next_value::text,6,'0'));
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.assign_hotel_invoice_number() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS assign_hotel_invoice_number ON public.hotel_invoices;
CREATE TRIGGER assign_hotel_invoice_number BEFORE INSERT ON public.hotel_invoices
FOR EACH ROW EXECUTE FUNCTION public.assign_hotel_invoice_number();

ALTER TABLE public.hotel_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY hotel_invoices_select ON public.hotel_invoices FOR SELECT TO authenticated
USING (public.hotel_permission_for(tenant_id,'hotel_invoicing','hotel.invoices.view'));
CREATE POLICY hotel_invoices_insert ON public.hotel_invoices FOR INSERT TO authenticated
WITH CHECK (public.hotel_permission_for(tenant_id,'hotel_invoicing','hotel.invoices.create'));
REVOKE ALL ON public.hotel_invoices FROM anon;
GRANT SELECT,INSERT ON public.hotel_invoices TO authenticated;
GRANT ALL ON public.hotel_invoices TO service_role;

-- Payment history is immutable from invoicing. Collection only appends to the
-- existing ledger, preserving payments after cancellation.
CREATE POLICY hotel_invoice_payment_insert ON public.hotel_reservation_payments
FOR INSERT TO authenticated WITH CHECK (
  public.hotel_permission_for(tenant_id,'hotel_invoicing','hotel.invoices.collect')
  AND EXISTS (SELECT 1 FROM public.hotel_invoices invoice
    WHERE invoice.tenant_id=hotel_reservation_payments.tenant_id
      AND invoice.reservation_id=hotel_reservation_payments.reservation_id)
);

CREATE OR REPLACE VIEW public.hotel_invoice_balances WITH (security_invoker=true) AS
SELECT invoice.id invoice_id, invoice.tenant_id, invoice.reservation_id,
  invoice.number, invoice.issued_at, invoice.created_at,
  balance.guest_id, balance.room_id, balance.check_in, balance.check_out,
  balance.nightly_rate, balance.discount, balance.status, balance.notes,
  balance.nights, balance.accommodation_total, balance.extras_total,
  balance.paid_total, balance.grand_total, balance.balance_due
FROM public.hotel_invoices invoice
JOIN public.hotel_reservation_balances balance
  ON balance.tenant_id=invoice.tenant_id AND balance.id=invoice.reservation_id;
GRANT SELECT ON public.hotel_invoice_balances TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.collect_hotel_invoice_payment(
  requested_invoice_id uuid, requested_amount numeric, requested_method text,
  requested_reference text DEFAULT NULL, requested_notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target public.hotel_invoices%ROWTYPE; remaining numeric; payment_id uuid;
BEGIN
  IF requested_amount IS NULL OR requested_amount<=0 THEN RAISE EXCEPTION 'Le montant doit etre positif'; END IF;
  IF nullif(btrim(requested_method),'') IS NULL THEN RAISE EXCEPTION 'Le mode de paiement est obligatoire'; END IF;
  SELECT * INTO target FROM public.hotel_invoices WHERE id=requested_invoice_id FOR UPDATE;
  IF NOT FOUND OR NOT public.hotel_permission_for(target.tenant_id,'hotel_invoicing','hotel.invoices.collect') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Encaissement interdit';
  END IF;
  SELECT greatest(0,balance_due) INTO remaining FROM public.hotel_reservation_balances
    WHERE tenant_id=target.tenant_id AND id=target.reservation_id;
  IF requested_amount>remaining THEN RAISE EXCEPTION 'Le versement depasse le solde restant'; END IF;
  INSERT INTO public.hotel_reservation_payments(tenant_id,reservation_id,amount,method,reference,notes)
  VALUES(target.tenant_id,target.reservation_id,requested_amount,btrim(requested_method),
    nullif(btrim(requested_reference),''),nullif(btrim(requested_notes),'')) RETURNING id INTO payment_id;
  RETURN payment_id;
END $$;
REVOKE ALL ON FUNCTION public.collect_hotel_invoice_payment(uuid,numeric,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.collect_hotel_invoice_payment(uuid,numeric,text,text,text) TO authenticated,service_role;
