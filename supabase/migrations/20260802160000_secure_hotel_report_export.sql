-- Export data is exposed only after a database-enforced HOTEL export check.
CREATE OR REPLACE FUNCTION public.get_hotel_report_export_data()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  target_tenant_id uuid:=public.hotel_tenant_id();
  reservation_rows jsonb;
  expense_rows jsonb;
BEGIN
  IF target_tenant_id IS NULL OR NOT public.hotel_permission_for(
    target_tenant_id,'hotel_reports','hotel.reports.export'
  ) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Permission d''export des rapports Hôtel requise';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',balance.id,'checkIn',balance.check_in,'checkOut',balance.check_out,
    'grandTotal',balance.grand_total,'paidTotal',balance.paid_total,
    'balanceDue',balance.balance_due
  ) ORDER BY balance.check_in,balance.id),'[]'::jsonb)
  INTO reservation_rows
  FROM public.hotel_reservation_balances balance
  WHERE balance.tenant_id=target_tenant_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',expense.id,'paidAt',expense.paid_at,'category',expense.category,
    'description',expense.description,'amount',expense.amount
  ) ORDER BY expense.paid_at,expense.id),'[]'::jsonb)
  INTO expense_rows
  FROM public.depenses expense
  WHERE expense.tenant_id=target_tenant_id;

  RETURN jsonb_build_object(
    'tenantId',target_tenant_id,
    'reservations',reservation_rows,
    'expenses',expense_rows
  );
END $$;

REVOKE ALL ON FUNCTION public.get_hotel_report_export_data() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_hotel_report_export_data() TO authenticated,service_role;
