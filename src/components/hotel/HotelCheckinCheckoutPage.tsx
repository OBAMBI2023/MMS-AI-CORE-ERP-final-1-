import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  LogIn,
  LogOut,
  BedDouble,
  AlertTriangle,
  Search,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { HotelAppShell } from "@/components/hotel/HotelAppShell";
import { DashboardKpiCard } from "@/components/mms/dashboard/DashboardKpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";
import { useActionPermission } from "@/hooks/use-action-permission";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useHotelBillingData,
  useHotelBillingRefresh,
  type HotelBillingReservation,
} from "@/hooks/use-hotel-billing";
import { formatCurrency, formatDate } from "@/lib/mms/format";
import {
  hotelPaymentStatus,
  HOTEL_PAYMENT_STATUS_BADGE,
  HOTEL_PAYMENT_STATUS_LABEL,
} from "@/lib/hotel-payments";
import { logAction } from "@/lib/audit.server";
import { cn } from "@/lib/utils";

const db = supabase as any;
const WALK_IN_LABEL = "Client de passage";

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  checked_in: "En séjour",
  checked_out: "Terminée",
  completed: "Terminée",
  cancelled: "Annulée",
  no_show: "Non présenté",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  confirmed: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  checked_in: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  checked_out: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300",
  completed: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  no_show: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Tab = "arrivals" | "inhouse" | "departures" | "history";
type ActionState = { mode: "checkin" | "checkout"; reservation: HotelBillingReservation } | null;

export function HotelCheckinCheckoutPage() {
  const { profile } = useTenant();
  const tenantId = profile?.tenant_id;
  const billing = useHotelBillingData();
  const refresh = useHotelBillingRefresh();
  const canCheckIn = useActionPermission("hotel.reservations.check_in");
  const canCheckOut = useActionPermission("hotel.reservations.check_out");
  const permissionsQuery = usePermissions();
  const { roleId } = permissionsQuery.data || { roleId: null };
  const { data: userData } = useQuery({ queryKey: ["user"], queryFn: () => supabase.auth.getUser() });
  const userId = userData?.data?.user?.id;

  const [tab, setTab] = useState<Tab>("arrivals");
  const [query, setQuery] = useState("");
  const [action, setAction] = useState<ActionState>(null);

  const today = todayISO();
  const reservations = billing.data?.reservations ?? [];
  const guests = useMemo(
    () => new Map((billing.data?.guests ?? []).map((g: any) => [g.id, g])),
    [billing.data],
  );
  const rooms = useMemo(
    () => new Map((billing.data?.rooms ?? []).map((r: any) => [r.id, r])),
    [billing.data],
  );

  const matchesQuery = (r: HotelBillingReservation) => {
    const g: any = guests.get(r.guest_id ?? "");
    const room: any = rooms.get(r.room_id);
    const haystack = `${g ? `${g.first_name} ${g.last_name} ${g.phone ?? ""}` : WALK_IN_LABEL} ${room?.number ?? ""}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  };

  const arrivals = useMemo(
    () =>
      reservations
        .filter((r) => ["pending", "confirmed"].includes(r.status) && r.check_in <= today)
        .filter(matchesQuery)
        .sort((a, b) => a.check_in.localeCompare(b.check_in)),
    [reservations, query, today, guests, rooms],
  );
  const inHouse = useMemo(
    () =>
      reservations
        .filter((r) => r.status === "checked_in")
        .filter(matchesQuery)
        .sort((a, b) => a.check_out.localeCompare(b.check_out)),
    [reservations, query, guests, rooms],
  );
  const departures = useMemo(
    () =>
      reservations
        .filter((r) => r.status === "checked_in" && r.check_out <= today)
        .filter(matchesQuery)
        .sort((a, b) => a.check_out.localeCompare(b.check_out)),
    [reservations, query, today, guests, rooms],
  );
  const history = useMemo(
    () =>
      reservations
        .filter((r) => ["checked_out", "completed", "cancelled", "no_show"].includes(r.status))
        .filter(matchesQuery)
        .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? "")),
    [reservations, query, guests, rooms],
  );

  const kpi = useMemo(
    () => ({
      arrivalsToday: reservations.filter(
        (r) => ["pending", "confirmed"].includes(r.status) && r.check_in === today,
      ).length,
      inHouse: reservations.filter((r) => r.status === "checked_in").length,
      departuresToday: reservations.filter((r) => r.status === "checked_in" && r.check_out === today)
        .length,
      overdueDepartures: reservations.filter((r) => r.status === "checked_in" && r.check_out < today)
        .length,
    }),
    [reservations, today],
  );

  const logHotelAction = async (action: string, r: HotelBillingReservation) => {
    if (!userId) return;
    const g: any = guests.get(r.guest_id ?? "");
    const room: any = rooms.get(r.room_id);
    await logAction(userId, roleId ?? null, action, "hotel_reservations", {
      reservation_id: r.id,
      guest: g ? `${g.first_name} ${g.last_name}` : WALK_IN_LABEL,
      room: room?.number ?? null,
    });
  };

  const checkIn = useMutation({
    mutationFn: async (r: HotelBillingReservation) => {
      if (!tenantId) throw new Error("Locataire introuvable");
      const { data, error } = await db
        .from("hotel_reservations")
        .update({ status: "checked_in", actual_check_in_at: new Date().toISOString() })
        .eq("tenant_id", tenantId)
        .eq("id", r.id)
        .eq("status", "confirmed")
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error(
          "Cette réservation n'est plus « Confirmée » : le check-in a peut-être déjà été effectué ou la réservation a été annulée.",
        );
      }
      return r;
    },
    onSuccess: async (r) => {
      await logHotelAction("check_in", r);
      toast.success("Check-in effectué");
      setAction(null);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const checkOut = useMutation({
    mutationFn: async (r: HotelBillingReservation) => {
      if (!tenantId) throw new Error("Locataire introuvable");
      const { data, error } = await db
        .from("hotel_reservations")
        .update({ status: "checked_out", actual_check_out_at: new Date().toISOString() })
        .eq("tenant_id", tenantId)
        .eq("id", r.id)
        .eq("status", "checked_in")
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error(
          "Cette réservation n'est plus « En séjour » : le check-out a peut-être déjà été effectué.",
        );
      }
      return r;
    },
    onSuccess: async (r) => {
      await logHotelAction("check_out", r);
      toast.success("Check-out effectué");
      setAction(null);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <HotelAppShell
      title="Check-in / Check-out"
      subtitle="SAOVIA HOTEL — Arrivées et départs"
      contentClassName="bg-[#F4FAF8] dark:bg-[#07211C]"
    >
      <div className="space-y-5 pb-4 sm:space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <DashboardKpiCard
            index={0}
            title="Arrivées aujourd'hui"
            value={String(kpi.arrivalsToday)}
            icon={LogIn}
            trend={null}
            accent="sky"
          />
          <DashboardKpiCard
            index={1}
            title="En séjour"
            value={String(kpi.inHouse)}
            icon={BedDouble}
            trend={null}
            accent="emerald"
          />
          <DashboardKpiCard
            index={2}
            title="Départs aujourd'hui"
            value={String(kpi.departuresToday)}
            icon={LogOut}
            trend={null}
            accent="amber"
          />
          <DashboardKpiCard
            index={3}
            title="Départs en retard"
            value={String(kpi.overdueDepartures)}
            icon={AlertTriangle}
            trend={null}
            accent="rose"
          />
        </div>

        <div className="rounded-2xl border bg-card p-3 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Client, téléphone ou chambre…"
              className="pl-10"
            />
          </div>
        </div>

        {billing.isLoading ? (
          <div className="grid min-h-72 place-items-center">
            <Loader2 className="size-7 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList className="flex h-auto w-full flex-wrap gap-1 bg-muted p-1 sm:inline-flex sm:w-auto">
              <TabsTrigger value="arrivals">Arrivées aujourd'hui ({arrivals.length})</TabsTrigger>
              <TabsTrigger value="inhouse">En séjour ({inHouse.length})</TabsTrigger>
              <TabsTrigger value="departures">Départs aujourd'hui ({departures.length})</TabsTrigger>
              <TabsTrigger value="history">Historique</TabsTrigger>
            </TabsList>
            <TabsContent value="arrivals">
              <ReservationList
                rows={arrivals}
                guests={guests}
                rooms={rooms}
                mode="checkin"
                canAct={canCheckIn}
                onAct={(r: HotelBillingReservation) => setAction({ mode: "checkin", reservation: r })}
                emptyLabel="Aucune arrivée prévue."
              />
            </TabsContent>
            <TabsContent value="inhouse">
              <ReservationList
                rows={inHouse}
                guests={guests}
                rooms={rooms}
                mode="checkout"
                canAct={canCheckOut}
                onAct={(r: HotelBillingReservation) => setAction({ mode: "checkout", reservation: r })}
                emptyLabel="Aucun client en séjour."
                showLateBadge
                today={today}
              />
            </TabsContent>
            <TabsContent value="departures">
              <ReservationList
                rows={departures}
                guests={guests}
                rooms={rooms}
                mode="checkout"
                canAct={canCheckOut}
                onAct={(r: HotelBillingReservation) => setAction({ mode: "checkout", reservation: r })}
                emptyLabel="Aucun départ prévu aujourd'hui."
                showLateBadge
                today={today}
              />
            </TabsContent>
            <TabsContent value="history">
              <ReservationList
                rows={history}
                guests={guests}
                rooms={rooms}
                mode="history"
                emptyLabel="Aucun historique pour le moment."
              />
            </TabsContent>
          </Tabs>
        )}
      </div>

      <CheckActionDialog
        action={action}
        guest={action ? guests.get(action.reservation.guest_id ?? "") : null}
        room={action ? rooms.get(action.reservation.room_id) : null}
        onClose={() => setAction(null)}
        onConfirm={() => {
          if (!action) return;
          if (action.mode === "checkin") checkIn.mutate(action.reservation);
          else checkOut.mutate(action.reservation);
        }}
        pending={checkIn.isPending || checkOut.isPending}
      />
    </HotelAppShell>
  );
}

function CheckActionDialog({
  action,
  guest,
  room,
  onClose,
  onConfirm,
  pending,
}: {
  action: ActionState;
  guest: any;
  room: any;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  const open = Boolean(action);
  const r = action?.reservation;
  const isCheckin = action?.mode === "checkin";
  const balance = Number(r?.balance_due ?? 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCheckin ? <LogIn className="size-5" /> : <LogOut className="size-5" />}
            {isCheckin ? "Confirmer le check-in" : "Confirmer le check-out"}
          </DialogTitle>
          <DialogDescription>
            {isCheckin
              ? "Vérifiez les informations avant d'enregistrer l'arrivée du client."
              : "Vérifiez les informations avant d'enregistrer le départ du client."}
          </DialogDescription>
        </DialogHeader>
        {r && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3 rounded-xl border bg-muted/20 p-3">
              <Info label="Client" value={guest ? `${guest.first_name} ${guest.last_name}` : WALK_IN_LABEL} />
              <Info label="Téléphone" value={guest?.phone || "—"} />
              <Info label="Chambre" value={room?.number ? `N° ${room.number}` : "—"} />
              <Info
                label="Séjour"
                value={`${formatDate(r.check_in)} → ${formatDate(r.check_out)} (${r.nights} nuit(s))`}
              />
              <Info label="Montant total" value={formatCurrency(Number(r.grand_total ?? 0))} />
              <Info label="Montant payé" value={formatCurrency(Number(r.paid_total ?? 0))} />
              <Info label="Reste à payer" value={formatCurrency(balance)} />
            </div>
            {!isCheckin && balance > 0 && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Solde restant : {formatCurrency(balance)}</p>
                  <p className="mt-0.5 text-xs">Le client n'a pas encore réglé la totalité du séjour.</p>
                  <Link
                    to="/hotel/facturation"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-2"
                  >
                    Aller à la facturation <ExternalLink className="size-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button onClick={onConfirm} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {pending ? "Traitement…" : isCheckin ? "Confirmer le check-in" : "Confirmer le check-out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function ReservationList({
  rows,
  guests,
  rooms,
  mode,
  canAct,
  onAct,
  emptyLabel,
  showLateBadge,
  today,
}: {
  rows: HotelBillingReservation[];
  guests: Map<string, any>;
  rooms: Map<string, any>;
  mode: "checkin" | "checkout" | "history";
  canAct?: boolean;
  onAct?: (r: HotelBillingReservation) => void;
  emptyLabel: string;
  showLateBadge?: boolean;
  today?: string;
}) {
  if (!rows.length) {
    return (
      <div className="mt-4 rounded-2xl border bg-card py-14 text-center text-sm text-muted-foreground shadow-sm">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="mt-4 overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-[#102A43] text-white">
            <tr>
              {["Client", "Logement", "Arrivée", "Départ", "Paiement", "Statut", "Action"].map((h) => (
                <th key={h} className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <ReservationRow
                key={r.id}
                r={r}
                guest={guests.get(r.guest_id ?? "")}
                room={rooms.get(r.room_id)}
                mode={mode}
                canAct={canAct}
                onAct={onAct}
                showLateBadge={showLateBadge}
                today={today}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y md:hidden">
        {rows.map((r) => (
          <ReservationCard
            key={r.id}
            r={r}
            guest={guests.get(r.guest_id ?? "")}
            room={rooms.get(r.room_id)}
            mode={mode}
            canAct={canAct}
            onAct={onAct}
            showLateBadge={showLateBadge}
            today={today}
          />
        ))}
      </div>
    </div>
  );
}

function ReservationRow({ r, guest, room, mode, canAct, onAct, showLateBadge, today }: any) {
  const paymentStatus = hotelPaymentStatus(r.paid_total, r.balance_due);
  const isLate = showLateBadge && r.status === "checked_in" && today && r.check_out < today;
  return (
    <tr className="align-top">
      <td className="px-3 py-3 font-medium">
        {guest ? `${guest.first_name} ${guest.last_name}` : WALK_IN_LABEL}
        <p className="text-xs font-normal text-muted-foreground">{guest?.phone || "—"}</p>
      </td>
      <td className="px-3 py-3">N° {room?.number ?? "—"}</td>
      <td className="px-3 py-3">{formatDate(r.check_in)}</td>
      <td className="px-3 py-3">
        {formatDate(r.check_out)}
        {isLate && (
          <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">
            En retard
          </span>
        )}
      </td>
      <td className="px-3 py-3">
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            HOTEL_PAYMENT_STATUS_BADGE[paymentStatus],
          )}
        >
          {HOTEL_PAYMENT_STATUS_LABEL[paymentStatus]}
        </span>
        {Number(r.balance_due) > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">Reste : {formatCurrency(Number(r.balance_due))}</p>
        )}
      </td>
      <td className="px-3 py-3">
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            STATUS_BADGE[r.status] ?? "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300",
          )}
        >
          {STATUS_LABEL[r.status] ?? r.status}
        </span>
      </td>
      <td className="px-3 py-3 text-right">
        <RowAction r={r} mode={mode} canAct={canAct} onAct={onAct} />
      </td>
    </tr>
  );
}

function ReservationCard({ r, guest, room, mode, canAct, onAct, showLateBadge, today }: any) {
  const paymentStatus = hotelPaymentStatus(r.paid_total, r.balance_due);
  const isLate = showLateBadge && r.status === "checked_in" && today && r.check_out < today;
  return (
    <div className="space-y-2.5 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{guest ? `${guest.first_name} ${guest.last_name}` : WALK_IN_LABEL}</p>
          <p className="text-xs text-muted-foreground">
            {guest?.phone || "—"} · N° {room?.number ?? "—"}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
            STATUS_BADGE[r.status] ?? "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300",
          )}
        >
          {STATUS_LABEL[r.status] ?? r.status}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {formatDate(r.check_in)} → {formatDate(r.check_out)}
        </span>
        {isLate && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">
            En retard
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            HOTEL_PAYMENT_STATUS_BADGE[paymentStatus],
          )}
        >
          {HOTEL_PAYMENT_STATUS_LABEL[paymentStatus]}
        </span>
        {Number(r.balance_due) > 0 && (
          <span className="text-xs font-medium text-muted-foreground">
            Reste {formatCurrency(Number(r.balance_due))}
          </span>
        )}
      </div>
      <RowAction r={r} mode={mode} canAct={canAct} onAct={onAct} full />
    </div>
  );
}

function RowAction({
  r,
  mode,
  canAct,
  onAct,
  full,
}: {
  r: HotelBillingReservation;
  mode: "checkin" | "checkout" | "history";
  canAct?: boolean;
  onAct?: (r: HotelBillingReservation) => void;
  full?: boolean;
}) {
  if (mode === "history") return null;
  if (mode === "checkin") {
    if (r.status !== "confirmed") {
      return <p className={cn("text-xs text-muted-foreground", full && "text-center")}>En attente de confirmation</p>;
    }
    if (!canAct) return <span className="text-xs text-muted-foreground">Non autorisé</span>;
    return (
      <Button size="sm" className={full ? "w-full" : undefined} onClick={() => onAct?.(r)}>
        Effectuer le check-in
      </Button>
    );
  }
  if (!canAct) return <span className="text-xs text-muted-foreground">Non autorisé</span>;
  return (
    <Button size="sm" variant="outline" className={full ? "w-full" : undefined} onClick={() => onAct?.(r)}>
      Effectuer le check-out
    </Button>
  );
}
