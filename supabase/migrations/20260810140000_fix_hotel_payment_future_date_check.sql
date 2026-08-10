-- Bug: a payment dated "today" was rejected as "in the future" whenever it
-- was submitted before local noon. collect_hotel_invoice_payment compared
-- effective_paid_at (a full timestamp — the frontend anchors the selected
-- date at 12:00 local, since the payment form only collects a date, not a
-- time) against now() + 1 minute, i.e. a precise instant. Before noon local,
-- that fabricated noon-timestamp for *today* is later than the actual
-- current instant, so it read as "future" even though the calendar date was
-- correct. Fix: compare calendar dates only (both sides cast to ::date,
-- evaluated in the same session timezone), matching what the form actually
-- asks for. No change to amounts, statuses, tenant isolation or any other
-- validation in this function.

CREATE OR REPLACE FUNCTION public.collect_hotel_invoice_payment(
  requested_invoice_id uuid,
  requested_amount numeric,
  requested_method text,
  requested_reference text DEFAULT NULL::text,
  requested_notes text DEFAULT NULL::text,
  requested_paid_at timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE target public.hotel_invoices%ROWTYPE; remaining numeric; payment_id uuid; effective_paid_at timestamptz;
BEGIN
  IF requested_amount IS NULL OR requested_amount<=0 THEN RAISE EXCEPTION 'Le montant doit etre positif'; END IF;
  IF nullif(btrim(requested_method),'') IS NULL THEN RAISE EXCEPTION 'Le mode de paiement est obligatoire'; END IF;
  effective_paid_at:=coalesce(requested_paid_at,now());
  IF effective_paid_at::date>now()::date THEN
    RAISE EXCEPTION 'La date de paiement ne peut pas etre dans le futur';
  END IF;
  SELECT * INTO target FROM public.hotel_invoices WHERE id=requested_invoice_id FOR UPDATE;
  IF NOT FOUND OR NOT public.hotel_permission_for(target.tenant_id,'hotel_invoicing','hotel.invoices.collect') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Encaissement interdit';
  END IF;
  SELECT greatest(0,balance_due) INTO remaining FROM public.hotel_reservation_balances
    WHERE tenant_id=target.tenant_id AND id=target.reservation_id;
  IF requested_amount>remaining THEN RAISE EXCEPTION 'Le versement depasse le solde restant'; END IF;
  INSERT INTO public.hotel_reservation_payments(tenant_id,reservation_id,amount,method,paid_at,reference,notes)
  VALUES(target.tenant_id,target.reservation_id,requested_amount,btrim(requested_method),effective_paid_at,
    nullif(btrim(requested_reference),''),nullif(btrim(requested_notes),'')) RETURNING id INTO payment_id;
  RETURN payment_id;
END
$function$;
