import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";

const db = supabase as any;

export type HotelBillingReservation = {
  id: string;
  tenant_id: string;
  guest_id: string | null;
  room_id: string;
  check_in: string;
  check_out: string;
  nights: number;
  nightly_rate: number;
  discount: number;
  status: string;
  notes: string | null;
  updated_at: string;
  actual_check_in_at: string | null;
  actual_check_out_at: string | null;
  accommodation_total: number;
  extras_total: number;
  paid_total: number;
  grand_total: number;
  balance_due: number;
  invoice_id: string | null;
  invoice_number: string | null;
  invoice_issued_at: string | null;
};

export function billingQueryKey(tenantId?: string | null) {
  return ["hotel-billing", tenantId] as const;
}

export function useHotelBillingData() {
  const { profile } = useTenant();
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: billingQueryKey(tenantId),
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const [r, inv, g, rooms] = await Promise.all([
        db
          .from("hotel_reservation_balances")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("check_in", { ascending: false }),
        db.from("hotel_invoices").select("id,number,reservation_id,issued_at").eq("tenant_id", tenantId),
        db
          .from("hotel_guests")
          .select("id,first_name,last_name,phone,email")
          .eq("tenant_id", tenantId),
        db
          .from("hotel_rooms")
          .select("id,number,room_type_id,hotel_room_types(name)")
          .eq("tenant_id", tenantId),
      ]);
      for (const result of [r, inv, g, rooms]) if (result.error) throw result.error;
      const invoiceByReservation = new Map(
        (inv.data ?? []).map((invoice: any) => [invoice.reservation_id, invoice]),
      );
      const reservations: HotelBillingReservation[] = (r.data ?? []).map((res: any) => {
        const invoice: any = invoiceByReservation.get(res.id);
        return {
          ...res,
          invoice_id: invoice?.id ?? null,
          invoice_number: invoice?.number ?? null,
          invoice_issued_at: invoice?.issued_at ?? null,
        };
      });
      return {
        reservations,
        guests: (g.data ?? []) as { id: string; first_name: string; last_name: string; phone: string | null; email: string | null }[],
        rooms: (rooms.data ?? []) as any[],
      };
    },
  });

  useEffect(() => {
    if (!tenantId) return;
    const refresh = () => qc.invalidateQueries({ queryKey: billingQueryKey(tenantId) });
    const channel = supabase
      .channel(`hotel-billing-${tenantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hotel_reservations", filter: `tenant_id=eq.${tenantId}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hotel_invoices", filter: `tenant_id=eq.${tenantId}` },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "hotel_reservation_payments",
          filter: `tenant_id=eq.${tenantId}`,
        },
        refresh,
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tenantId, qc]);

  return query;
}

export function useHotelBillingRefresh() {
  const qc = useQueryClient();
  const { profile } = useTenant();
  const tenantId = profile?.tenant_id;
  return () => {
    qc.invalidateQueries({ queryKey: billingQueryKey(tenantId) });
    qc.invalidateQueries({ queryKey: ["hotel-reservations", tenantId] });
    qc.invalidateQueries({ queryKey: ["hotel-overview"] });
    qc.invalidateQueries({ queryKey: ["hotel-reports", tenantId] });
    qc.invalidateQueries({ queryKey: ["hotel-payments-dashboard", tenantId] });
  };
}

export type HotelPaymentRecord = {
  id: string;
  amount: number;
  method: string | null;
  paid_at: string;
  reference: string | null;
  notes: string | null;
};

export function useHotelPaymentHistory(reservationId?: string | null) {
  const { profile } = useTenant();
  const tenantId = profile?.tenant_id;
  return useQuery({
    queryKey: ["hotel-payment-history", tenantId, reservationId],
    enabled: Boolean(tenantId && reservationId),
    queryFn: async () => {
      const { data, error } = await db
        .from("hotel_reservation_payments")
        .select("id,amount,method,paid_at,reference,notes")
        .eq("tenant_id", tenantId)
        .eq("reservation_id", reservationId)
        .order("paid_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as HotelPaymentRecord[];
    },
  });
}
