import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";
import type { HotelBillingReservation } from "@/hooks/use-hotel-billing";

const db = supabase as any;

export type HotelReportPayment = {
  id: string;
  amount: number;
  method: string | null;
  paid_at: string;
  reservation_id: string;
  reference: string | null;
};

export type HotelReportExpense = {
  id: string;
  expense_date: string;
  category: string;
  amount: number;
};

export type HotelReportRoom = {
  id: string;
  number: string;
  status: string;
  rate: number;
  room_type_id: string | null;
  hotel_room_types: { name: string } | null;
};

export type HotelReportGuest = {
  id: string;
  first_name: string;
  last_name: string;
};

export function hotelReportsQueryKey(tenantId?: string | null) {
  return ["hotel-reports", tenantId] as const;
}

export function useHotelReportsData() {
  const { profile } = useTenant();
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: hotelReportsQueryKey(tenantId),
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const [reservations, payments, expenses, rooms, guests] = await Promise.all([
        db
          .from("hotel_reservation_balances")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("check_in", { ascending: false }),
        db
          .from("hotel_reservation_payments")
          .select("id,amount,method,paid_at,reservation_id,reference")
          .eq("tenant_id", tenantId),
        db
          .from("hotel_expenses")
          .select("id,expense_date,category,amount")
          .eq("tenant_id", tenantId),
        db
          .from("hotel_rooms")
          .select("id,number,status,rate,room_type_id,hotel_room_types(name)")
          .eq("tenant_id", tenantId),
        db.rpc("hotel_guest_list_for_ui"),
      ]);
      for (const result of [reservations, payments, expenses, rooms, guests]) if (result.error) throw result.error;
      return {
        reservations: (reservations.data ?? []) as (HotelBillingReservation & { created_at: string })[],
        payments: (payments.data ?? []) as HotelReportPayment[],
        expenses: (expenses.data ?? []) as HotelReportExpense[],
        rooms: (rooms.data ?? []) as HotelReportRoom[],
        guests: (guests.data ?? []) as HotelReportGuest[],
      };
    },
  });

  useEffect(() => {
    if (!tenantId) return;
    const refresh = () => qc.invalidateQueries({ queryKey: hotelReportsQueryKey(tenantId) });
    const channel = supabase
      .channel(`hotel-reports-${tenantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hotel_reservations", filter: `tenant_id=eq.${tenantId}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hotel_reservation_payments", filter: `tenant_id=eq.${tenantId}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hotel_expenses", filter: `tenant_id=eq.${tenantId}` },
        refresh,
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tenantId, qc]);

  return query;
}
