import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BadgeCheck,
  ClipboardCheck,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  Printer,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";
import { formatCurrency, formatDate } from "@/lib/mms/format";
import { cn } from "@/lib/utils";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { useHotelSettings } from "@/hooks/use-hotel-settings";
import {
  useHotelBillingData,
  useHotelPaymentHistory,
  type HotelBillingReservation,
  type HotelPaymentRecord,
} from "@/hooks/use-hotel-billing";
import { downloadPdf } from "@/lib/mms/download-pdf";
import { createHotelReservationDetailPdf } from "@/lib/mms/hotel-reservation-detail-pdf";
import { createHotelReservationConfirmationPdf } from "@/lib/mms/hotel-reservation-confirmation-pdf";
import { createHotelInvoicePdf } from "@/lib/mms/hotel-invoice-pdf";
import { createHotelPaymentReceiptPdf } from "@/lib/mms/hotel-payment-receipt-pdf";
import {
  createHotelAccommodationCertificatePdf,
  isHotelCertificateIssueDateValid,
  HOTEL_CERTIFICATE_DATE_ERROR,
} from "@/lib/mms/hotel-accommodation-certificate-pdf";

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

function previewPdf(doc: jsPDF) {
  const url = doc.output("bloburl");
  window.open(url.toString(), "_blank", "noopener,noreferrer");
}

function printPdf(doc: jsPDF) {
  doc.autoPrint();
  const url = doc.output("bloburl");
  window.open(url.toString(), "_blank", "noopener,noreferrer");
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium">{value}</p>
    </div>
  );
}

type CertificateDraft = {
  guestName: string;
  guestNationality: string;
  guestIdentityType: string;
  guestIdentityNumber: string;
  guestPhone: string;
  guestEmail: string;
};

type DocAction = {
  key: string;
  label: string;
  build: () => Promise<{ doc: jsPDF; filename: string }>;
  successLabel: string;
  errorLabel: string;
};

function DocumentRow({
  icon: Icon,
  title,
  subtitle,
  action,
  disabledReason,
  busyKey,
  onBusyChange,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle: ReactNode;
  action: DocAction | null;
  disabledReason?: ReactNode;
  busyKey: string | null;
  onBusyChange: (key: string | null) => void;
}) {
  const busy = action ? busyKey === action.key : false;

  const run = async (mode: "preview" | "download" | "print") => {
    if (!action) return;
    onBusyChange(action.key);
    try {
      const pdf = await action.build();
      if (mode === "download") {
        await downloadPdf(pdf.doc, pdf.filename);
        toast.success(action.successLabel);
      } else if (mode === "print") {
        printPdf(pdf.doc);
      } else {
        previewPdf(pdf.doc);
      }
    } catch (error) {
      console.error(action.errorLabel, error);
      toast.error(action.errorLabel);
    } finally {
      onBusyChange(null);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        </div>
      </div>
      {action ? (
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2.5"
            disabled={busy}
            onClick={() => run("preview")}
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}
            <span className="ml-1 text-xs">Aperçu</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2.5"
            disabled={busy}
            onClick={() => run("print")}
          >
            <Printer className="size-3.5" />
            <span className="ml-1 text-xs">Imprimer</span>
          </Button>
          <Button size="sm" className="h-8 px-2.5" disabled={busy} onClick={() => run("download")}>
            <Download className="size-3.5" />
            <span className="ml-1 text-xs">Télécharger / Partager</span>
          </Button>
        </div>
      ) : (
        <p className="shrink-0 text-xs text-muted-foreground sm:max-w-[45%] sm:text-right">
          {disabledReason}
        </p>
      )}
    </div>
  );
}

export function HotelReservationDetailSheet({
  reservationId,
  onOpenChange,
}: {
  reservationId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { profile } = useTenant();
  const tenantId = profile?.tenant_id;
  const { settings, logoUrl, signatureUrl } = useCompanySettings(tenantId);
  const { data: hotelSettings } = useHotelSettings();
  const billing = useHotelBillingData();
  const payments = useHotelPaymentHistory(reservationId);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const companionsQuery = useQuery({
    queryKey: ["hotel-reservation-companions", tenantId, reservationId],
    enabled: Boolean(tenantId && reservationId),
    queryFn: async () => {
      const { data, error } = await db
        .from("hotel_guest_companions")
        .select("full_name")
        .eq("tenant_id", tenantId)
        .eq("reservation_id", reservationId);
      if (error) throw error;
      return (data ?? []).map((c: any) => c.full_name as string);
    },
  });

  const reservation: HotelBillingReservation | undefined = useMemo(
    () => billing.data?.reservations.find((r) => r.id === reservationId),
    [billing.data?.reservations, reservationId],
  );
  const guest = useMemo(
    () => billing.data?.guests.find((g) => g.id === reservation?.guest_id),
    [billing.data?.guests, reservation?.guest_id],
  );
  const room: any = useMemo(
    () => billing.data?.rooms.find((r: any) => r.id === reservation?.room_id),
    [billing.data?.rooms, reservation?.room_id],
  );

  const open = Boolean(reservationId);
  const guestName = guest ? `${guest.first_name} ${guest.last_name}` : WALK_IN_LABEL;
  const roomLabel = room?.number ? `N° ${room.number}` : "—";

  const defaultCertificateDraft = (): CertificateDraft => ({
    guestName,
    guestNationality: (guest as any)?.nationality ?? "",
    guestIdentityType: (guest as any)?.identity_type ?? "",
    guestIdentityNumber: (guest as any)?.identity_number ?? "",
    guestPhone: guest?.phone ?? "",
    guestEmail: guest?.email ?? "",
  });
  const [certificateDraft, setCertificateDraft] = useState<CertificateDraft | null>(null);
  const [certificateBusy, setCertificateBusy] = useState<"preview" | "download" | "print" | null>(
    null,
  );

  useEffect(() => {
    setCertificateDraft(null);
    setCertificateBusy(null);
  }, [reservationId]);

  const buildDetailPdf = async () =>
    createHotelReservationDetailPdf(
      {
        id: reservation!.id,
        check_in: reservation!.check_in,
        check_out: reservation!.check_out,
        nights: Number(reservation!.nights ?? 0),
        nightly_rate: Number(reservation!.nightly_rate ?? 0),
        discount: Number(reservation!.discount ?? 0),
        grand_total: Number(reservation!.grand_total ?? 0),
        paid_total: Number(reservation!.paid_total ?? 0),
        balance_due: Number(reservation!.balance_due ?? 0),
        guestName,
        guestPhone: guest?.phone,
        guestEmail: guest?.email,
        companions: companionsQuery.data ?? [],
        identityProvided: Boolean(
          (guest as any)?.identity_document_path ||
          (guest as any)?.identity_number ||
          (guest as any)?.identity_type,
        ),
        roomNumber: room?.number ?? "—",
        notes: reservation!.notes,
      },
      settings,
      logoUrl,
      signatureUrl,
    );

  const buildConfirmationPdf = async () =>
    createHotelReservationConfirmationPdf(
      {
        id: reservation!.id,
        check_in: reservation!.check_in,
        check_out: reservation!.check_out,
        nights: Number(reservation!.nights ?? 0),
        nightly_rate: Number(reservation!.nightly_rate ?? 0),
        grand_total: Number(reservation!.grand_total ?? 0),
        paid_total: Number(reservation!.paid_total ?? 0),
        guestName,
        guestPhone: guest?.phone,
        guestEmail: guest?.email,
        roomNumber: room?.number ?? "—",
        checkInTime: hotelSettings?.check_in_time,
        checkOutTime: hotelSettings?.check_out_time,
        bookingTerms: hotelSettings?.booking_terms,
        cancellationPolicy: hotelSettings?.cancellation_policy,
      },
      settings,
      logoUrl,
      signatureUrl,
    );

  const buildCertificatePdf = async () => {
    const draft = certificateDraft ?? defaultCertificateDraft();
    return createHotelAccommodationCertificatePdf(
      {
        id: reservation!.id,
        check_in: reservation!.check_in,
        check_out: reservation!.check_out,
        nights: Number(reservation!.nights ?? 0),
        roomNumber: room?.number ?? "—",
        guestName: draft.guestName.trim() || guestName,
        guestNationality: draft.guestNationality.trim() || null,
        guestIdentityType: draft.guestIdentityType.trim() || null,
        guestIdentityNumber: draft.guestIdentityNumber.trim() || null,
        guestPhone: draft.guestPhone.trim() || null,
        guestEmail: draft.guestEmail.trim() || null,
      },
      settings,
      logoUrl,
      signatureUrl,
    );
  };

  const runCertificateAction = async (mode: "preview" | "download" | "print") => {
    setCertificateBusy(mode);
    try {
      const pdf = await buildCertificatePdf();
      if (mode === "download") {
        await downloadPdf(pdf.doc, pdf.filename);
        toast.success("Certificat d'hébergement téléchargé.");
      } else if (mode === "print") {
        printPdf(pdf.doc);
      } else {
        previewPdf(pdf.doc);
      }
    } catch (error) {
      console.error("Impossible de générer le certificat d'hébergement.", error);
      const message = error instanceof Error ? error.message : "";
      toast.error(
        message === HOTEL_CERTIFICATE_DATE_ERROR
          ? message
          : "Impossible de générer le certificat d'hébergement.",
      );
    } finally {
      setCertificateBusy(null);
    }
  };

  const buildInvoicePdf = async () => {
    const [extrasResult, paymentsResult] = await Promise.all([
      db
        .from("hotel_reservation_extras")
        .select("label,quantity,unit_price")
        .eq("tenant_id", tenantId)
        .eq("reservation_id", reservation!.id),
      db
        .from("hotel_reservation_payments")
        .select("amount,method,paid_at,reference")
        .eq("tenant_id", tenantId)
        .eq("reservation_id", reservation!.id)
        .order("paid_at", { ascending: false }),
    ]);
    if (extrasResult.error) throw extrasResult.error;
    if (paymentsResult.error) throw paymentsResult.error;
    const extras = (extrasResult.data ?? []).map((extra: any) => ({
      label: extra.label,
      quantity: Number(extra.quantity ?? 0),
      unitPrice: Number(extra.unit_price ?? 0),
    }));
    const paymentRows = (paymentsResult.data ?? []).map((payment: any) => ({
      date: payment.paid_at,
      amount: Number(payment.amount ?? 0),
      method: payment.method,
      reference: payment.reference,
    }));
    return createHotelInvoicePdf(
      {
        id: reservation!.id,
        check_in: reservation!.check_in,
        check_out: reservation!.check_out,
        nights: Number(reservation!.nights ?? 0),
        nightly_rate: Number(reservation!.nightly_rate ?? 0),
        discount: Number(reservation!.discount ?? 0),
        grand_total: Number(reservation!.grand_total ?? 0),
        paid_total: Number(reservation!.paid_total ?? 0),
        balance_due: Number(reservation!.balance_due ?? 0),
        guestName,
        guestPhone: guest?.phone,
        guestEmail: guest?.email,
        roomNumber: room?.number ?? "—",
      },
      settings,
      logoUrl,
      signatureUrl,
      extras,
      paymentRows,
    );
  };

  const buildReceiptPdf = (payment: HotelPaymentRecord) => async () =>
    createHotelPaymentReceiptPdf(
      {
        paymentId: payment.id,
        amount: Number(payment.amount),
        method: payment.method,
        paidAt: payment.paid_at,
        reference: payment.reference,
        notes: payment.notes,
        invoiceNumber: reservation!.invoice_number,
        guestName,
        guestPhone: guest?.phone,
        guestEmail: guest?.email,
        roomNumber: room?.number ?? "—",
        checkIn: reservation!.check_in,
        checkOut: reservation!.check_out,
        grandTotal: Number(reservation!.grand_total),
        paidTotal: Number(reservation!.paid_total),
        balanceDue: Number(reservation!.balance_due),
      },
      settings,
      logoUrl,
      signatureUrl,
    );

  const hasInvoice = Boolean(reservation?.invoice_number);
  const paymentRows = payments.data ?? [];
  const isLoading = billing.isLoading || !reservation;
  const certificateDateValid = reservation
    ? isHotelCertificateIssueDateValid(reservation.check_in)
    : false;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Réservation — {guest ? guestName : WALK_IN_LABEL}</DialogTitle>
          <DialogDescription>Informations du séjour et documents associés.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : billing.isError ? (
          <p className="text-sm text-muted-foreground">
            Impossible de charger les informations de cette réservation pour le moment.
          </p>
        ) : (
          <Tabs defaultValue="informations">
            <TabsList>
              <TabsTrigger value="informations">Informations</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="informations" className="space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded-xl border bg-muted/20 p-3 sm:grid-cols-3">
                <Info label="Client" value={guestName} />
                <Info label="Téléphone" value={guest?.phone || "—"} />
                <Info label="Chambre" value={roomLabel} />
                <Info
                  label="Séjour"
                  value={`${formatDate(reservation!.check_in)} → ${formatDate(reservation!.check_out)}`}
                />
                <Info label="Nuits" value={String(reservation!.nights ?? 0)} />
                <Info
                  label="Statut"
                  value={
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        STATUS_BADGE[reservation!.status],
                      )}
                    >
                      {STATUS_LABEL[reservation!.status] ?? reservation!.status}
                    </span>
                  }
                />
                <Info
                  label="Montant total"
                  value={formatCurrency(Number(reservation!.grand_total ?? 0))}
                />
                <Info label="Payé" value={formatCurrency(Number(reservation!.paid_total ?? 0))} />
                <Info
                  label="Reste à payer"
                  value={formatCurrency(Number(reservation!.balance_due ?? 0))}
                />
              </div>
              {reservation!.notes && (
                <div className="rounded-xl border bg-muted/20 p-3 text-sm">
                  <p className="mb-1 text-[11px] text-muted-foreground">Notes</p>
                  <p>{reservation!.notes}</p>
                </div>
              )}
              {(companionsQuery.data ?? []).length > 0 && (
                <div className="rounded-xl border bg-muted/20 p-3 text-sm">
                  <p className="mb-1 text-[11px] text-muted-foreground">Accompagnants</p>
                  <p>{(companionsQuery.data ?? []).join(", ")}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="space-y-2.5">
              <DocumentRow
                icon={FileText}
                title="Facture"
                subtitle={hasInvoice ? `N° ${reservation!.invoice_number}` : "Aucune facture émise"}
                busyKey={busyKey}
                onBusyChange={setBusyKey}
                action={
                  hasInvoice
                    ? {
                        key: "invoice",
                        label: "Facture",
                        build: buildInvoicePdf,
                        successLabel: "Facture téléchargée.",
                        errorLabel: "Impossible de générer la facture PDF.",
                      }
                    : null
                }
                disabledReason={
                  !hasInvoice ? (
                    <>
                      Aucune facture n'a encore été émise.{" "}
                      <Link
                        to="/hotel/facturation"
                        className="font-semibold underline underline-offset-2"
                      >
                        Facturation <ExternalLink className="inline size-3" />
                      </Link>
                    </>
                  ) : null
                }
              />

              {paymentRows.length === 0 ? (
                <DocumentRow
                  icon={Receipt}
                  title="Reçu"
                  subtitle="Aucun paiement enregistré"
                  action={null}
                  disabledReason="Aucun encaissement n'a encore été enregistré pour cette réservation."
                  busyKey={busyKey}
                  onBusyChange={setBusyKey}
                />
              ) : (
                paymentRows.map((payment) => (
                  <DocumentRow
                    key={payment.id}
                    icon={Receipt}
                    title="Reçu de paiement"
                    subtitle={`${formatCurrency(Number(payment.amount))} · ${formatDate(payment.paid_at)} · ${payment.method ?? "—"}`}
                    busyKey={busyKey}
                    onBusyChange={setBusyKey}
                    action={{
                      key: `receipt-${payment.id}`,
                      label: "Reçu",
                      build: buildReceiptPdf(payment),
                      successLabel: "Reçu téléchargé.",
                      errorLabel: "Impossible de générer le reçu PDF.",
                    }}
                  />
                ))
              )}

              <DocumentRow
                icon={ClipboardCheck}
                title="Confirmation de réservation"
                subtitle="Remise au client à la réservation"
                busyKey={busyKey}
                onBusyChange={setBusyKey}
                action={{
                  key: "confirmation",
                  label: "Confirmation",
                  build: buildConfirmationPdf,
                  successLabel: "Confirmation de réservation téléchargée.",
                  errorLabel: "Impossible de générer la confirmation PDF.",
                }}
              />

              {certificateDraft ? (
                <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <BadgeCheck className="size-4 text-primary" /> Certificat d'hébergement
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => setCertificateDraft(null)}
                    >
                      Retour
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Document délivré avant l'arrivée du voyageur (démarches administratives, visa…).
                    Vérifiez ou complétez ses informations avant de générer le certificat.
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="mb-1 block text-xs">Nom du voyageur</Label>
                      <Input
                        value={certificateDraft.guestName}
                        onChange={(e) =>
                          setCertificateDraft({ ...certificateDraft, guestName: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs">Nationalité</Label>
                      <Input
                        value={certificateDraft.guestNationality}
                        onChange={(e) =>
                          setCertificateDraft({
                            ...certificateDraft,
                            guestNationality: e.target.value,
                          })
                        }
                        placeholder="Non renseignée"
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs">Type de pièce d'identité</Label>
                      <Input
                        value={certificateDraft.guestIdentityType}
                        onChange={(e) =>
                          setCertificateDraft({
                            ...certificateDraft,
                            guestIdentityType: e.target.value,
                          })
                        }
                        placeholder="Passeport, CNI…"
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs">Numéro de pièce / passeport</Label>
                      <Input
                        value={certificateDraft.guestIdentityNumber}
                        onChange={(e) =>
                          setCertificateDraft({
                            ...certificateDraft,
                            guestIdentityNumber: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs">Téléphone</Label>
                      <Input
                        value={certificateDraft.guestPhone}
                        onChange={(e) =>
                          setCertificateDraft({ ...certificateDraft, guestPhone: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs">Email</Label>
                      <Input
                        value={certificateDraft.guestEmail}
                        onChange={(e) =>
                          setCertificateDraft({ ...certificateDraft, guestEmail: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="rounded-lg bg-background/60 p-2.5 text-xs text-muted-foreground">
                    Logement {room?.number ?? "—"} · {formatDate(reservation!.check_in)} →{" "}
                    {formatDate(reservation!.check_out)}
                  </div>
                  {certificateDateValid ? (
                    <div className="flex flex-wrap justify-end gap-1.5 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5"
                        disabled={Boolean(certificateBusy)}
                        onClick={() => runCertificateAction("preview")}
                      >
                        {certificateBusy === "preview" ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Eye className="size-3.5" />
                        )}
                        <span className="ml-1 text-xs">Aperçu</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5"
                        disabled={Boolean(certificateBusy)}
                        onClick={() => runCertificateAction("print")}
                      >
                        <Printer className="size-3.5" />
                        <span className="ml-1 text-xs">Imprimer</span>
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 px-2.5"
                        disabled={Boolean(certificateBusy)}
                        onClick={() => runCertificateAction("download")}
                      >
                        <Download className="size-3.5" />
                        <span className="ml-1 text-xs">Télécharger / Partager</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold">{HOTEL_CERTIFICATE_DATE_ERROR}</p>
                        <p className="mt-0.5 text-xs">
                          Ce certificat est exclusivement un document pré-arrivée : il ne peut pas
                          être délivré si la date d'arrivée est déjà passée ou débute aujourd'hui.
                          Vérifiez les dates de cette réservation (« Modifier la réservation »)
                          avant de réessayer.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <BadgeCheck className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Certificat d'hébergement</p>
                      <p className="text-xs text-muted-foreground">
                        Attestation pré-arrivée pour démarches administratives ou de visa
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="h-8 shrink-0 px-2.5"
                    onClick={() => setCertificateDraft(defaultCertificateDraft())}
                  >
                    <BadgeCheck className="size-3.5" />
                    <span className="ml-1 text-xs">Vérifier et générer</span>
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
