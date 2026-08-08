import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FileDown, Plus, Receipt, Search, Wallet } from "lucide-react";
import { HotelAppShell } from "@/components/hotel/HotelAppShell";
import { HotelComingSoon } from "@/components/hotel/HotelComingSoon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";
import { formatCurrency, formatDate } from "@/lib/mms/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useActionPermission } from "@/hooks/use-action-permission";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { useTenantModules } from "@/hooks/use-tenant-modules";
import {
  type HotelBillingReservation,
  useHotelBillingData,
  useHotelBillingRefresh,
} from "@/hooks/use-hotel-billing";
import {
  HOTEL_PAYMENT_STATUS_BADGE,
  HOTEL_PAYMENT_STATUS_LABEL,
  hotelPaymentStatus,
  type HotelPaymentStatus,
} from "@/lib/hotel-payments";
import { createHotelInvoicePdf } from "@/lib/mms/hotel-invoice-pdf";
import { downloadPdf } from "@/lib/mms/download-pdf";

const db = supabase as any;
const WALK_IN_LABEL = "Client de passage";

export function HotelFacturationPage() {
  const { profile } = useTenant();
  const { settings, logoUrl } = useCompanySettings(profile?.tenant_id);
  const { data, isLoading } = useHotelBillingData();
  const refresh = useHotelBillingRefresh();
  const modulesQuery = useTenantModules();
  const invoicingEnabled = modulesQuery.data?.has("hotel_invoicing") !== false;
  const canView = useActionPermission("hotel.invoices.view");
  const canCreate = useActionPermission("hotel.invoices.create");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | HotelPaymentStatus>("all");

  const guests = useMemo(
    () => new Map((data?.guests ?? []).map((g: any) => [g.id, g])),
    [data?.guests],
  );
  const rooms = useMemo(
    () => new Map((data?.rooms ?? []).map((r: any) => [r.id, r])),
    [data?.rooms],
  );

  const filtered = useMemo(() => {
    const reservations = data?.reservations ?? [];
    return reservations
      .filter((r) => !["cancelled", "no_show"].includes(r.status))
      .filter((r) => {
        const status = hotelPaymentStatus(r.paid_total, r.balance_due);
        return statusFilter === "all" || status === statusFilter;
      })
      .filter((r) => {
        const guest: any = guests.get(r.guest_id ?? "");
        const room: any = rooms.get(r.room_id);
        const haystack = `${guest ? `${guest.first_name} ${guest.last_name} ${guest.phone ?? ""}` : WALK_IN_LABEL} ${room?.number ?? ""} ${r.invoice_number ?? ""}`.toLowerCase();
        return haystack.includes(query.trim().toLowerCase());
      });
  }, [data?.reservations, guests, rooms, query, statusFilter]);

  const createInvoice = useMutation({
    mutationFn: async (reservationId: string) => {
      if (!profile?.tenant_id) throw new Error("Tenant introuvable");
      const { error } = await db
        .from("hotel_invoices")
        .insert({ tenant_id: profile.tenant_id, reservation_id: reservationId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Facture générée");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const downloadInvoicePdf = async (reservation: HotelBillingReservation) => {
    try {
      const guest: any = guests.get(reservation.guest_id ?? "");
      const room: any = rooms.get(reservation.room_id);
      const pdf = await createHotelInvoicePdf(
        {
          id: reservation.id,
          check_in: reservation.check_in,
          check_out: reservation.check_out,
          nights: Number(reservation.nights ?? 0),
          nightly_rate: Number(reservation.nightly_rate ?? 0),
          discount: Number(reservation.discount ?? 0),
          grand_total: Number(reservation.grand_total ?? 0),
          paid_total: Number(reservation.paid_total ?? 0),
          balance_due: Number(reservation.balance_due ?? 0),
          status: reservation.status,
          guestName: guest ? `${guest.first_name} ${guest.last_name}` : WALK_IN_LABEL,
          guestPhone: guest?.phone,
          roomNumber: room?.number ?? "—",
          notes: reservation.notes,
        },
        settings,
        logoUrl,
      );
      await downloadPdf(pdf.doc, pdf.filename);
      toast.success("Facture téléchargée.");
    } catch (error) {
      console.error("Échec de la génération de la facture PDF", error);
      toast.error("Impossible de générer la facture PDF.");
    }
  };

  if (invoicingEnabled === false) {
    return (
      <HotelComingSoon
        title="Facturation"
        icon={Receipt}
        description="Le module Facturation Hôtel n'est pas activé pour cet établissement. Contactez un administrateur pour l'activer."
      />
    );
  }

  if (!canView) {
    return (
      <HotelComingSoon
        title="Facturation"
        icon={Receipt}
        description="Vous n'avez pas la permission de consulter les factures Hôtel."
      />
    );
  }

  return (
    <HotelAppShell title="Facturation" subtitle="Factures, créances et encaissements Hôtel">
      <section className="hotel-panel">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <Input
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Client, chambre ou numéro de facture…"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="unpaid">{HOTEL_PAYMENT_STATUS_LABEL.unpaid}</SelectItem>
              <SelectItem value="partial">{HOTEL_PAYMENT_STATUS_LABEL.partial}</SelectItem>
              <SelectItem value="paid">{HOTEL_PAYMENT_STATUS_LABEL.paid}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] table-fixed text-sm">
            <colgroup>
              <col className="w-[18%]" />
              <col className="w-[10%]" />
              <col className="w-[16%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead>
              <tr className="border-b text-left text-xs uppercase text-slate-400">
                <th className="p-3">Client</th>
                <th>Chambre</th>
                <th>Facture</th>
                <th>Total</th>
                <th>Payé</th>
                <th>Reste</th>
                <th>Statut</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const guest: any = guests.get(r.guest_id ?? "");
                const room: any = rooms.get(r.room_id);
                const status = hotelPaymentStatus(r.paid_total, r.balance_due);
                return (
                  <tr key={r.id} className="border-b">
                    <td className="truncate p-3 font-medium">
                      {guest ? `${guest.first_name} ${guest.last_name}` : WALK_IN_LABEL}
                    </td>
                    <td>N° {room?.number ?? "—"}</td>
                    <td className="truncate">
                      {r.invoice_number ?? <span className="text-muted-foreground">Non émise</span>}
                    </td>
                    <td className="font-medium">{formatCurrency(Number(r.grand_total))}</td>
                    <td>{formatCurrency(Number(r.paid_total))}</td>
                    <td className="font-medium">{formatCurrency(Math.max(0, Number(r.balance_due)))}</td>
                    <td>
                      <span
                        className={cn(
                          "rounded-full px-2 py-1 text-xs font-semibold",
                          HOTEL_PAYMENT_STATUS_BADGE[status],
                        )}
                      >
                        {HOTEL_PAYMENT_STATUS_LABEL[status]}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        {!r.invoice_id && canCreate && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={createInvoice.isPending}
                            onClick={() => createInvoice.mutate(r.id)}
                          >
                            <Plus className="mr-1 size-3.5" />
                            Facture
                          </Button>
                        )}
                        {r.invoice_id && (
                          <Button size="icon" variant="ghost" className="size-8" onClick={() => void downloadInvoicePdf(r)}>
                            <FileDown className="size-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            window.location.href = `/hotel/caisse?reservation=${r.id}`;
                          }}
                        >
                          <Wallet className="mr-1 size-3.5" />
                          Encaisser
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && !isLoading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Aucune réservation trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </HotelAppShell>
  );
}
