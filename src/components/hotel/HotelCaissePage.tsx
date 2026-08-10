import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Banknote,
  Check,
  ChevronsUpDown,
  FileDown,
  Search,
} from "lucide-react";
import { HotelAppShell } from "@/components/hotel/HotelAppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/mms/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useActionPermission } from "@/hooks/use-action-permission";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { useTenantModules } from "@/hooks/use-tenant-modules";
import {
  type HotelBillingReservation,
  type HotelPaymentRecord,
  useHotelBillingData,
  useHotelBillingRefresh,
  useHotelPaymentHistory,
} from "@/hooks/use-hotel-billing";
import {
  HOTEL_PAYMENT_METHODS,
  HOTEL_PAYMENT_STATUS_BADGE,
  HOTEL_PAYMENT_STATUS_LABEL,
  hotelPaymentStatus,
} from "@/lib/hotel-payments";
import { createHotelPaymentReceiptPdf } from "@/lib/mms/hotel-payment-receipt-pdf";
import { downloadPdf } from "@/lib/mms/download-pdf";
import { HotelComingSoon } from "@/components/hotel/HotelComingSoon";

const db = supabase as any;
const WALK_IN_LABEL = "Client de passage";
// Local calendar date (not toISOString(), which is UTC and can read as
// tomorrow — or still yesterday — depending on the browser's timezone
// offset relative to UTC around local midnight).
const todayInputValue = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const emptyPaymentForm = {
  amount: "",
  method: "" as string,
  paidAt: todayInputValue(),
  reference: "",
  notes: "",
};

// Pure UI convenience — prefills the same `amount` field the user could type
// into manually. Doesn't bypass or change the existing amount validation.
const QUICK_AMOUNT_OPTIONS: { label: string; compute: (balanceDue: number) => number }[] = [
  { label: "25 %", compute: (balanceDue) => Math.round(balanceDue * 0.25) },
  { label: "50 %", compute: (balanceDue) => Math.round(balanceDue * 0.5) },
  { label: "Solde complet", compute: (balanceDue) => Math.round(balanceDue) },
];

export function HotelCaissePage() {
  const { profile } = useTenant();
  const { settings, logoUrl, signatureUrl } = useCompanySettings(profile?.tenant_id);
  const { data, isLoading } = useHotelBillingData();
  const refresh = useHotelBillingRefresh();
  const modulesQuery = useTenantModules();
  const invoicingEnabled = modulesQuery.data?.has("hotel_invoicing") !== false;
  const canCollect = useActionPermission("hotel.invoices.collect");
  const canCreateInvoice = useActionPermission("hotel.invoices.create");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyPaymentForm);
  const [urlIntentApplied, setUrlIntentApplied] = useState(false);

  const guests = useMemo(
    () => new Map((data?.guests ?? []).map((g: any) => [g.id, g])),
    [data?.guests],
  );
  const rooms = useMemo(
    () => new Map((data?.rooms ?? []).map((r: any) => [r.id, r])),
    [data?.rooms],
  );
  const reservations = data?.reservations ?? [];
  const selected = reservations.find((r) => r.id === selectedId) ?? null;
  const selectedGuest: any = selected ? guests.get(selected.guest_id ?? "") : null;
  const selectedRoom: any = selected ? rooms.get(selected.room_id) : null;

  const history = useHotelPaymentHistory(selected?.id);

  useEffect(() => {
    if (urlIntentApplied || !data) return;
    const params = new URLSearchParams(window.location.search);
    const reservationId = params.get("reservation");
    if (reservationId && reservations.some((r) => r.id === reservationId)) {
      setSelectedId(reservationId);
    }
    setUrlIntentApplied(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlIntentApplied, data]);

  useEffect(() => {
    if (!selected) return;
    setForm((prev) => ({
      ...prev,
      amount: selected.balance_due > 0 ? String(selected.balance_due) : "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const paymentStatus = selected ? hotelPaymentStatus(selected.paid_total, selected.balance_due) : null;
  const amountValue = Number(form.amount);
  const amountInvalid =
    !Number.isFinite(amountValue) ||
    amountValue <= 0 ||
    (selected ? amountValue > selected.balance_due + 0.01 : true);

  const collect = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id) throw new Error("Tenant introuvable");
      if (!selected) throw new Error("Sélectionnez une réservation ou une facture.");
      if (amountInvalid) throw new Error("Le montant encaissé est invalide.");
      if (!form.paidAt) throw new Error("La date de paiement est obligatoire.");

      let invoiceId = selected.invoice_id;
      if (!invoiceId) {
        if (!canCreateInvoice) {
          throw new Error(
            "Aucune facture n'existe pour cette réservation et vous n'avez pas la permission d'en créer une.",
          );
        }
        const created = await db
          .from("hotel_invoices")
          .insert({ tenant_id: profile.tenant_id, reservation_id: selected.id })
          .select("id,number")
          .single();
        if (created.error) throw created.error;
        invoiceId = created.data.id;
      }

      const paidAtIso = new Date(`${form.paidAt}T12:00:00`).toISOString();
      const method = form.method.trim() || null;
      const { data: paymentId, error } = await db.rpc("collect_hotel_invoice_payment", {
        requested_invoice_id: invoiceId,
        requested_amount: amountValue,
        requested_method: method,
        requested_reference: form.reference.trim() || null,
        requested_notes: form.notes.trim() || null,
        requested_paid_at: paidAtIso,
      });
      if (error) throw error;
      return {
        paymentId: paymentId as string,
        amount: amountValue,
        method,
        paidAt: paidAtIso,
        reference: form.reference.trim() || null,
        notes: form.notes.trim() || null,
      };
    },
    onSuccess: async (result) => {
      toast.success("Encaissement enregistré");
      setForm((prev) => ({ ...emptyPaymentForm, method: prev.method }));
      refresh();
      if (selected) {
        await downloadReceipt(result, selected, selectedGuest, selectedRoom);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const downloadReceipt = async (
    payment: {
      paymentId: string;
      amount: number;
      method: string | null;
      paidAt: string;
      reference: string | null;
      notes: string | null;
    },
    reservation: HotelBillingReservation,
    guest: any,
    room: any,
  ) => {
    try {
      const newPaidTotal = Number(reservation.paid_total) + payment.amount;
      const newBalance = Math.max(0, Number(reservation.grand_total) - newPaidTotal);
      const pdf = await createHotelPaymentReceiptPdf(
        {
          paymentId: payment.paymentId,
          amount: payment.amount,
          method: payment.method,
          paidAt: payment.paidAt,
          reference: payment.reference,
          notes: payment.notes,
          invoiceNumber: reservation.invoice_number,
          guestName: guest ? `${guest.first_name} ${guest.last_name}` : WALK_IN_LABEL,
          guestPhone: guest?.phone,
          guestEmail: guest?.email,
          roomNumber: room?.number ?? "—",
          checkIn: reservation.check_in,
          checkOut: reservation.check_out,
          grandTotal: Number(reservation.grand_total),
          paidTotal: newPaidTotal,
          balanceDue: newBalance,
        },
        settings,
        logoUrl,
        signatureUrl,
      );
      await downloadPdf(pdf.doc, pdf.filename);
    } catch (error) {
      console.error("Échec de la génération du reçu d'encaissement", error);
      toast.error("Impossible de générer le reçu PDF.");
    }
  };

  const downloadHistoricalReceipt = async (payment: HotelPaymentRecord) => {
    if (!selected) return;
    await downloadReceipt(
      {
        paymentId: payment.id,
        amount: Number(payment.amount),
        method: payment.method,
        paidAt: payment.paid_at,
        reference: payment.reference,
        notes: payment.notes,
      },
      { ...selected, paid_total: Number(selected.paid_total) - Number(payment.amount) },
      selectedGuest,
      selectedRoom,
    );
  };

  if (invoicingEnabled === false) {
    return (
      <HotelComingSoon
        title="Caisse"
        icon={Banknote}
        description="Le module Facturation Hôtel n'est pas activé pour cet établissement. Contactez un administrateur pour l'activer."
      />
    );
  }

  return (
    <HotelAppShell title="Caisse" subtitle="Encaissements des réservations et factures">
      <section className="mb-5 rounded-2xl border border-border bg-card p-4 shadow-sm sm:mb-6 sm:rounded-[24px] sm:p-6 dark:border-white/5 dark:bg-[#151B2F]">
        <div className="mb-4">
          <h2 className="text-base font-semibold sm:text-lg">Sélectionner une réservation ou une facture</h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Recherchez par client, numéro de chambre ou numéro de facture.
          </p>
        </div>
        <ReservationPicker
          reservations={reservations}
          guests={guests}
          rooms={rooms}
          value={selectedId}
          onChange={setSelectedId}
        />
      </section>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {selected && (
        <div className="space-y-5 sm:space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            <KpiTile label="Montant total" value={formatCurrency(Number(selected.grand_total))} />
            <KpiTile
              label="Déjà payé"
              value={formatCurrency(Number(selected.paid_total))}
              valueClassName="text-emerald-600 dark:text-emerald-400"
            />
            <KpiTile
              label="Reste à payer"
              value={formatCurrency(Math.max(0, Number(selected.balance_due)))}
              valueClassName={
                Number(selected.balance_due) > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }
            />
            <KpiTile
              label="Statut"
              value={
                paymentStatus ? (
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                      HOTEL_PAYMENT_STATUS_BADGE[paymentStatus],
                    )}
                  >
                    {HOTEL_PAYMENT_STATUS_LABEL[paymentStatus]}
                  </span>
                ) : (
                  "—"
                )
              }
            />
          </div>

          <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:rounded-[24px] sm:p-6 dark:border-white/5 dark:bg-[#151B2F]">
              <h3 className="mb-4 font-semibold">Détails de la réservation</h3>
              <dl className="space-y-2.5 text-sm">
                <Row label="Client" value={selectedGuest ? `${selectedGuest.first_name} ${selectedGuest.last_name}` : WALK_IN_LABEL} />
                <Row label="Téléphone" value={selectedGuest?.phone ?? "—"} />
                <Row label="Chambre" value={`N° ${selectedRoom?.number ?? "—"}`} />
                <Row label="Séjour" value={`${formatDate(selected.check_in)} → ${formatDate(selected.check_out)}`} />
                <Row label="Facture" value={selected.invoice_number ?? "Non émise"} />
              </dl>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:rounded-[24px] sm:p-6 dark:border-white/5 dark:bg-[#151B2F]">
              <h3 className="mb-4 font-semibold">Encaisser un paiement</h3>
              {!canCollect ? (
                <p className="text-sm text-muted-foreground">
                  Vous n'avez pas la permission d'enregistrer un encaissement.
                </p>
              ) : Number(selected.balance_due) <= 0 ? (
                <p className="text-sm font-medium text-emerald-600">
                  Cette réservation est intégralement soldée.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Montant encaissé *">
                    <Input
                      type="number"
                      min="0"
                      max={selected.balance_due}
                      step="1"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {QUICK_AMOUNT_OPTIONS.map((opt) => (
                        <Button
                          key={opt.label}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 rounded-full px-2.5 text-xs font-medium"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              amount: String(opt.compute(Number(selected.balance_due))),
                            }))
                          }
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                    {amountInvalid && form.amount !== "" && (
                      <p className="mt-1 text-xs font-medium text-destructive">
                        Le montant doit être positif et ne peut pas dépasser le solde restant.
                      </p>
                    )}
                  </Field>
                  <Field label="Date de paiement *">
                    <Input
                      type="date"
                      max={todayInputValue()}
                      value={form.paidAt}
                      onChange={(e) => setForm({ ...form, paidAt: e.target.value })}
                    />
                  </Field>
                  <Field label="Mode de paiement">
                    <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner (facultatif)" />
                      </SelectTrigger>
                      <SelectContent>
                        {HOTEL_PAYMENT_METHODS.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Référence (facultatif)">
                    <Input
                      value={form.reference}
                      onChange={(e) => setForm({ ...form, reference: e.target.value })}
                      placeholder="N° de transaction, chèque…"
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Note (facultatif)">
                      <Textarea
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        rows={2}
                      />
                    </Field>
                  </div>
                  <div className="flex justify-end sm:col-span-2">
                    <Button
                      className="w-full sm:w-auto"
                      disabled={collect.isPending || amountInvalid || !form.paidAt}
                      onClick={() => collect.mutate()}
                    >
                      <Banknote className="mr-1.5 size-4" />
                      {collect.isPending
                        ? "Enregistrement…"
                        : form.amount
                          ? `Encaisser ${formatCurrency(amountValue)}`
                          : "Encaisser"}
                    </Button>
                  </div>
                </div>
              )}
            </section>
          </div>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:rounded-[24px] sm:p-6 dark:border-white/5 dark:bg-[#151B2F]">
            <h3 className="mb-4 font-semibold">Historique des paiements</h3>
            <PaymentHistoryTable
              payments={history.data ?? []}
              loading={history.isLoading}
              onDownloadReceipt={downloadHistoricalReceipt}
            />
          </section>
        </div>
      )}

      {!selected && !isLoading && (
        <Card className="flex flex-col items-center justify-center rounded-[24px] px-6 py-16 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary mb-4">
            <Search className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold">Aucune sélection</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Recherchez un client, une chambre ou un numéro de facture ci-dessus pour afficher les
            informations d'encaissement.
          </p>
        </Card>
      )}
    </HotelAppShell>
  );
}

function KpiTile({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:rounded-[20px] sm:p-5 dark:border-white/5 dark:bg-[#151B2F]">
      <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
        {label}
      </p>
      <div className={cn("mt-2 text-lg font-bold leading-none tracking-tight sm:text-xl", valueClassName)}>
        {value}
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("truncate text-right", bold && "font-semibold")}>{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}

function ReservationPicker({
  reservations,
  guests,
  rooms,
  value,
  onChange,
}: {
  reservations: HotelBillingReservation[];
  guests: Map<string, any>;
  rooms: Map<string, any>;
  value: string | null;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = reservations.find((r) => r.id === value) ?? null;
  const selectedGuest: any = selected ? guests.get(selected.guest_id ?? "") : null;
  const normalizedSearch = search.trim().toLowerCase();

  const sorted = useMemo(
    () =>
      [...reservations]
        .filter((r) => !["cancelled", "no_show"].includes(r.status))
        .sort((a, b) => {
          const aOpen = a.balance_due > 0 ? 0 : 1;
          const bOpen = b.balance_due > 0 ? 0 : 1;
          return aOpen - bOpen || b.check_in.localeCompare(a.check_in);
        }),
    [reservations],
  );

  const filtered = sorted.filter((r) => {
    const guest: any = guests.get(r.guest_id ?? "");
    const room: any = rooms.get(r.room_id);
    const haystack = `${guest ? `${guest.first_name} ${guest.last_name} ${guest.phone ?? ""}` : WALK_IN_LABEL} ${room?.number ?? ""} ${r.invoice_number ?? ""}`.toLowerCase();
    return haystack.includes(normalizedSearch);
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected
              ? `${selectedGuest ? `${selectedGuest.first_name} ${selectedGuest.last_name}` : WALK_IN_LABEL} · N° ${rooms.get(selected.room_id)?.number ?? "—"} · ${formatCurrency(Number(selected.balance_due))} restant`
              : "Rechercher un client, une chambre ou une facture…"}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput value={search} onValueChange={setSearch} placeholder="Nom, chambre, N° facture…" />
          <CommandList>
            {!filtered.length && <CommandEmpty>Aucun résultat.</CommandEmpty>}
            <CommandGroup>
              {filtered.map((r) => {
                const guest: any = guests.get(r.guest_id ?? "");
                const room: any = rooms.get(r.room_id);
                const status = hotelPaymentStatus(r.paid_total, r.balance_due);
                return (
                  <CommandItem
                    key={r.id}
                    value={r.id}
                    onSelect={() => {
                      onChange(r.id);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check className={cn("mr-2 size-4", value === r.id ? "opacity-100" : "opacity-0")} />
                    <span className="flex-1 truncate">
                      {guest ? `${guest.first_name} ${guest.last_name}` : WALK_IN_LABEL} · N° {room?.number ?? "—"}
                      {r.invoice_number ? ` · ${r.invoice_number}` : ""}
                    </span>
                    <span
                      className={cn(
                        "ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        HOTEL_PAYMENT_STATUS_BADGE[status],
                      )}
                    >
                      {HOTEL_PAYMENT_STATUS_LABEL[status]}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function PaymentHistoryTable({
  payments,
  loading,
  onDownloadReceipt,
}: {
  payments: HotelPaymentRecord[];
  loading: boolean;
  onDownloadReceipt: (payment: HotelPaymentRecord) => void;
}) {
  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (!payments.length)
    return <p className="text-sm text-muted-foreground">Aucun encaissement enregistré pour cette réservation.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-slate-400">
            <th className="p-2">Date</th>
            <th>Montant</th>
            <th>Mode</th>
            <th>Référence</th>
            <th>Note</th>
            <th className="text-right">Reçu</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="p-2">{formatDateTime(p.paid_at)}</td>
              <td className="font-medium">{formatCurrency(Number(p.amount))}</td>
              <td>{p.method ?? "—"}</td>
              <td className="truncate">{p.reference ?? "—"}</td>
              <td className="max-w-[200px] truncate">{p.notes ?? "—"}</td>
              <td className="text-right">
                <Button size="icon" variant="ghost" className="size-8" onClick={() => onDownloadReceipt(p)}>
                  <FileDown className="size-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
