import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { jsPDF } from "jspdf";
import type { PDFDocumentProxy } from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  FileDown,
  LayoutList,
  Loader2,
  Plus,
  Printer,
  Receipt,
  Search,
  SlidersHorizontal,
  Table2,
  Wallet,
} from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { formatCurrency, formatDate } from "@/lib/mms/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useActionPermission } from "@/hooks/use-action-permission";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { useHotelSettings } from "@/hooks/use-hotel-settings";
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
  const { settings, logoUrl, signatureUrl, stampUrl } = useCompanySettings(profile?.tenant_id);
  const { data: hotelSettings } = useHotelSettings();
  const showSignatureOnDocuments = hotelSettings?.show_signature_on_documents ?? true;
  const showStampOnDocuments = hotelSettings?.show_stamp_on_documents ?? true;
  const visibleSignatureUrl = showSignatureOnDocuments ? signatureUrl : null;
  const visibleStampUrl = showStampOnDocuments ? stampUrl : null;
  const { data, isLoading } = useHotelBillingData();
  const refresh = useHotelBillingRefresh();
  const modulesQuery = useTenantModules();
  const invoicingEnabled = modulesQuery.data?.has("hotel_invoicing") !== false;
  const canView = useActionPermission("hotel.invoices.view");
  const canCreate = useActionPermission("hotel.invoices.create");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | HotelPaymentStatus>("all");
  const [view, setView] = useState<"list" | "table">("table");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [preview, setPreview] = useState<{ doc: jsPDF; filename: string } | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [previewRendering, setPreviewRendering] = useState(false);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const pdfjsDocRef = useRef<PDFDocumentProxy | null>(null);
  const pdfjsLoadingTaskRef = useRef<{ destroy: () => Promise<void> } | null>(null);

  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setView("list");
  }, []);

  useEffect(() => {
    if (!preview) return;
    let cancelled = false;
    setPreviewRendering(true);
    (async () => {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
      const bytes = preview.doc.output("arraybuffer") as ArrayBuffer;
      const loadingTask = pdfjsLib.getDocument({ data: bytes });
      pdfjsLoadingTaskRef.current = loadingTask;
      const pdfDoc = await loadingTask.promise;
      if (cancelled) return;
      pdfjsDocRef.current = pdfDoc;
      const page = await pdfDoc.getPage(1);
      const canvas = previewCanvasRef.current;
      if (!canvas || cancelled) return;
      const containerWidth = Math.max(240, (previewContainerRef.current?.clientWidth ?? 632) - 32);
      const unscaledViewport = page.getViewport({ scale: 1 });
      const scale = (containerWidth / unscaledViewport.width) * (window.devicePixelRatio || 1);
      const viewport = page.getViewport({ scale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${containerWidth}px`;
      canvas.style.height = `${(containerWidth * unscaledViewport.height) / unscaledViewport.width}px`;
      await page.render({ canvas, viewport }).promise;
      if (!cancelled) setPreviewRendering(false);
    })().catch((error) => {
      console.error("Échec du rendu de l'aperçu PDF", error);
      if (!cancelled) {
        setPreviewRendering(false);
        toast.error("Impossible d'afficher l'aperçu de la facture.");
      }
    });
    return () => {
      cancelled = true;
      pdfjsDocRef.current = null;
      const loadingTask = pdfjsLoadingTaskRef.current;
      pdfjsLoadingTaskRef.current = null;
      if (loadingTask) void loadingTask.destroy();
    };
  }, [preview]);

  const guests = useMemo(
    () => new Map((data?.guests ?? []).map((g: any) => [g.id, g])),
    [data?.guests],
  );
  const rooms = useMemo(
    () => new Map((data?.rooms ?? []).map((r: any) => [r.id, r])),
    [data?.rooms],
  );

  const baseReservations = useMemo(
    () => (data?.reservations ?? []).filter((r) => !["cancelled", "no_show"].includes(r.status)),
    [data?.reservations],
  );

  const stats = useMemo(() => {
    let paid = 0;
    let unpaid = 0;
    let remaining = 0;
    for (const r of baseReservations) {
      const status = hotelPaymentStatus(r.paid_total, r.balance_due);
      if (status === "paid") paid += 1;
      else unpaid += 1;
      remaining += Math.max(0, Number(r.balance_due));
    }
    return { total: baseReservations.length, paid, unpaid, remaining };
  }, [baseReservations]);

  const filtered = useMemo(() => {
    return baseReservations
      .filter((r) => {
        const status = hotelPaymentStatus(r.paid_total, r.balance_due);
        return statusFilter === "all" || status === statusFilter;
      })
      .filter((r) => {
        const guest: any = guests.get(r.guest_id ?? "");
        const room: any = rooms.get(r.room_id);
        const haystack =
          `${guest ? `${guest.first_name} ${guest.last_name} ${guest.phone ?? ""}` : WALK_IN_LABEL} ${room?.number ?? ""} ${r.invoice_number ?? ""}`.toLowerCase();
        return haystack.includes(query.trim().toLowerCase());
      });
  }, [baseReservations, guests, rooms, query, statusFilter]);

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

  const buildInvoicePdf = async (
    reservation: HotelBillingReservation,
  ): Promise<{ doc: jsPDF; filename: string } | null> => {
    try {
      const guest: any = guests.get(reservation.guest_id ?? "");
      const room: any = rooms.get(reservation.room_id);
      const [extrasResult, paymentsResult] = await Promise.all([
        db
          .from("hotel_reservation_extras")
          .select("label,quantity,unit_price")
          .eq("tenant_id", profile?.tenant_id)
          .eq("reservation_id", reservation.id),
        db
          .from("hotel_reservation_payments")
          .select("amount,method,paid_at,reference")
          .eq("tenant_id", profile?.tenant_id)
          .eq("reservation_id", reservation.id)
          .order("paid_at", { ascending: false }),
      ]);
      if (extrasResult.error) throw extrasResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      const extras = (extrasResult.data ?? []).map((extra: any) => ({
        label: extra.label,
        quantity: Number(extra.quantity ?? 0),
        unitPrice: Number(extra.unit_price ?? 0),
      }));
      const payments = (paymentsResult.data ?? []).map((payment: any) => ({
        date: payment.paid_at,
        amount: Number(payment.amount ?? 0),
        method: payment.method,
        reference: payment.reference,
      }));
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
          guestName: guest ? `${guest.first_name} ${guest.last_name}` : WALK_IN_LABEL,
          guestPhone: guest?.phone,
          guestEmail: guest?.email,
          roomNumber: room?.number ?? "—",
        },
        settings,
        logoUrl,
        visibleSignatureUrl,
        extras,
        payments,
        visibleStampUrl,
      );
      return { doc: pdf.doc, filename: pdf.filename };
    } catch (error) {
      console.error("Échec de la génération de la facture PDF", error);
      toast.error("Impossible de générer la facture PDF.");
      return null;
    }
  };

  const downloadInvoicePdf = async (reservation: HotelBillingReservation) => {
    const pdf = await buildInvoicePdf(reservation);
    if (!pdf) return;
    await downloadPdf(pdf.doc, pdf.filename);
    toast.success("Facture téléchargée.");
  };

  const openPreview = async (reservation: HotelBillingReservation) => {
    setPreviewLoadingId(reservation.id);
    const pdf = await buildInvoicePdf(reservation);
    setPreviewLoadingId(null);
    if (!pdf) return;
    setPreview({ doc: pdf.doc, filename: pdf.filename });
  };

  const closePreview = () => setPreview(null);

  const printPreview = async () => {
    const pdfDoc = pdfjsDocRef.current;
    if (!pdfDoc || !preview) return;
    const images: string[] = [];
    for (let i = 1; i <= pdfDoc.numPages; i += 1) {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvas, viewport }).promise;
      images.push(canvas.toDataURL("image/png"));
    }
    if (!images.length) return;
    const printFrame = document.createElement("iframe");
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    document.body.appendChild(printFrame);
    const frameDoc = printFrame.contentDocument;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(
        `<html><head><title>${preview.filename}</title><style>@page{margin:0}body{margin:0}img{width:100%;display:block;page-break-after:always}img:last-child{page-break-after:auto}</style></head><body>${images
          .map((src) => `<img src="${src}" />`)
          .join("")}</body></html>`,
      );
      frameDoc.close();
    }
    window.setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
    }, 250);
    window.setTimeout(() => {
      printFrame.remove();
    }, 60_000);
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

  const goToCaisse = (reservationId: string) => {
    window.location.href = `/hotel/caisse?reservation=${reservationId}`;
  };

  return (
    <HotelAppShell title="Facturation" subtitle="Factures, créances et encaissements Hôtel">
      <section className="hotel-panel">
        <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(
            [
              ["Factures total", String(stats.total), Receipt, "bg-primary/10 text-primary"],
              [
                "Payées",
                String(stats.paid),
                CheckCircle2,
                "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
              ],
              [
                "Impayées",
                String(stats.unpaid),
                AlertCircle,
                "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
              ],
              [
                "Reste à encaisser",
                formatCurrency(stats.remaining),
                Wallet,
                "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
              ],
            ] as const
          ).map(([label, value, Icon, tone]) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-2xl border bg-card px-3.5 py-3 shadow-sm"
            >
              <div className={cn("grid size-9 shrink-0 place-items-center rounded-xl", tone)}>
                <Icon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-bold leading-none">{value}</p>
                <p className="mt-1.5 truncate text-[11px] text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full flex-1 sm:min-w-56">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <Input
              className="w-full pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Client, chambre ou numéro de facture…"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
            >
              <SelectTrigger className="flex-1 sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="unpaid">{HOTEL_PAYMENT_STATUS_LABEL.unpaid}</SelectItem>
                <SelectItem value="partial">{HOTEL_PAYMENT_STATUS_LABEL.partial}</SelectItem>
                <SelectItem value="paid">{HOTEL_PAYMENT_STATUS_LABEL.paid}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="relative shrink-0 sm:hidden"
              onClick={() => setFilterSheetOpen(true)}
              aria-label="Filtres"
            >
              <SlidersHorizontal className="size-4" />
              {statusFilter !== "all" && (
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" />
              )}
            </Button>
            <div className="flex shrink-0 items-center gap-1 rounded-lg border p-0.5">
              <Button
                type="button"
                size="icon"
                variant={view === "list" ? "default" : "ghost"}
                className="size-8"
                aria-pressed={view === "list"}
                aria-label="Vue liste"
                onClick={() => setView("list")}
              >
                <LayoutList className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant={view === "table" ? "default" : "ghost"}
                className="size-8"
                aria-pressed={view === "table"}
                aria-label="Vue tableau"
                onClick={() => setView("table")}
              >
                <Table2 className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
          <SheetContent side="bottom" className="rounded-t-[24px] sm:hidden">
            <SheetHeader>
              <SheetTitle>Filtrer les factures</SheetTitle>
              <SheetDescription>Affinez la liste par statut de paiement.</SheetDescription>
            </SheetHeader>
            <div className="mt-4 flex flex-wrap gap-2">
              {(
                [
                  ["all", "Tous les statuts"],
                  ["unpaid", HOTEL_PAYMENT_STATUS_LABEL.unpaid],
                  ["partial", HOTEL_PAYMENT_STATUS_LABEL.partial],
                  ["paid", HOTEL_PAYMENT_STATUS_LABEL.paid],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={cn(
                    "h-10 rounded-xl px-3 text-sm font-medium ring-1 transition-colors",
                    statusFilter === value
                      ? "bg-primary text-primary-foreground ring-primary"
                      : "bg-background text-foreground ring-border hover:bg-muted",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <SheetFooter className="mt-6">
              <Button type="button" onClick={() => setFilterSheetOpen(false)} className="w-full">
                Voir {filtered.length} facture{filtered.length > 1 ? "s" : ""}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

        {!isLoading && !filtered.length && (
          <div className="rounded-2xl border border-dashed bg-muted/20 py-12 text-center text-slate-400">
            Aucune réservation trouvée.
          </div>
        )}

        {!isLoading && filtered.length > 0 && view === "table" && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] table-fixed text-sm">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[10%]" />
                <col className="w-[16%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead>
                <tr className="border-b text-left text-xs uppercase text-slate-400">
                  <th className="p-3">Client</th>
                  <th>Chambre</th>
                  <th>Facture</th>
                  <th>Statut</th>
                  <th>Total</th>
                  <th>Reste</th>
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
                        {r.invoice_number ?? (
                          <span className="text-muted-foreground">Non émise</span>
                        )}
                      </td>
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
                      <td className="font-medium">{formatCurrency(Number(r.grand_total))}</td>
                      <td className="font-medium">
                        {formatCurrency(Math.max(0, Number(r.balance_due)))}
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
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8"
                              aria-label="Aperçu de la facture"
                              title="Aperçu"
                              disabled={previewLoadingId === r.id}
                              onClick={() => void openPreview(r)}
                            >
                              {previewLoadingId === r.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Eye className="size-4" />
                              )}
                            </Button>
                          )}
                          {r.invoice_id && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8"
                              aria-label="Télécharger la facture"
                              title="Télécharger la facture"
                              onClick={() => void downloadInvoicePdf(r)}
                            >
                              <FileDown className="size-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => goToCaisse(r.id)}>
                            <Wallet className="mr-1 size-3.5" />
                            Encaisser
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && filtered.length > 0 && view === "list" && (
          <div className="space-y-2.5">
            {filtered.map((r) => {
              const guest: any = guests.get(r.guest_id ?? "");
              const room: any = rooms.get(r.room_id);
              const status = hotelPaymentStatus(r.paid_total, r.balance_due);
              return (
                <InvoiceMobileCard
                  key={r.id}
                  reservation={r}
                  guestName={guest ? `${guest.first_name} ${guest.last_name}` : WALK_IN_LABEL}
                  roomNumber={room?.number ?? "—"}
                  status={status}
                  canCreate={canCreate}
                  isCreatePending={createInvoice.isPending}
                  isPreviewLoading={previewLoadingId === r.id}
                  onCreateInvoice={() => createInvoice.mutate(r.id)}
                  onPreview={() => void openPreview(r)}
                  onDownload={() => void downloadInvoicePdf(r)}
                  onCollect={() => goToCaisse(r.id)}
                />
              );
            })}
          </div>
        )}
      </section>

      <Dialog open={preview !== null} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="hotel-theme flex h-[92vh] w-[95vw] max-w-3xl flex-col gap-3 p-4 sm:h-[85vh] sm:p-6">
          <DialogHeader className="shrink-0">
            <DialogTitle>Aperçu de la facture</DialogTitle>
            <DialogDescription>
              Facture {preview?.filename.replace(/^facture-|\.pdf$/g, "")}
            </DialogDescription>
          </DialogHeader>
          <div
            ref={previewContainerRef}
            className="min-h-0 flex-1 overflow-auto rounded-md border bg-muted/40 p-3 sm:p-6"
          >
            <div className="flex min-h-full items-start justify-center">
              {previewRendering && (
                <div className="flex h-64 w-full items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              )}
              <canvas
                ref={previewCanvasRef}
                className={cn("rounded-sm bg-white shadow-md", previewRendering && "hidden")}
              />
            </div>
          </div>
          <DialogFooter className="shrink-0 gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => void printPreview()}>
              <Printer className="mr-1.5 size-4" />
              Imprimer
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => preview && void downloadPdf(preview.doc, preview.filename)}
            >
              <FileDown className="mr-1.5 size-4" />
              Télécharger PDF
            </Button>
            <Button type="button" onClick={closePreview}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HotelAppShell>
  );
}

function InvoiceMobileCard({
  reservation: r,
  guestName,
  roomNumber,
  status,
  canCreate,
  isCreatePending,
  isPreviewLoading,
  onCreateInvoice,
  onPreview,
  onDownload,
  onCollect,
}: {
  reservation: HotelBillingReservation;
  guestName: string;
  roomNumber: string;
  status: HotelPaymentStatus;
  canCreate: boolean;
  isCreatePending: boolean;
  isPreviewLoading: boolean;
  onCreateInvoice: () => void;
  onPreview: () => void;
  onDownload: () => void;
  onCollect: () => void;
}) {
  const invoiceDate = r.invoice_issued_at ?? r.check_in;
  return (
    <div className="rounded-2xl border bg-card p-3.5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Receipt className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-semibold">
            {r.invoice_number ?? <span className="text-muted-foreground">Non émise</span>}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDate(invoiceDate)} · N° {roomNumber}
          </p>
          <p className="mt-0.5 break-words text-sm text-foreground">{guestName}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold leading-none">
            {formatCurrency(Math.max(0, Number(r.balance_due)))}
          </p>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Total {formatCurrency(Number(r.grand_total))}
          </p>
          <span
            className={cn(
              "mt-1.5 inline-block rounded-full px-2 py-1 text-[11px] font-semibold",
              HOTEL_PAYMENT_STATUS_BADGE[status],
            )}
          >
            {HOTEL_PAYMENT_STATUS_LABEL[status]}
          </span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {!r.invoice_id && canCreate && (
          <Button
            size="sm"
            variant="outline"
            className="h-10 flex-1"
            disabled={isCreatePending}
            onClick={onCreateInvoice}
          >
            <Plus className="mr-1 size-3.5" />
            Facture
          </Button>
        )}
        {r.invoice_id && (
          <Button
            size="icon"
            variant="outline"
            className="h-10 w-10 shrink-0"
            aria-label="Aperçu de la facture"
            title="Aperçu"
            disabled={isPreviewLoading}
            onClick={onPreview}
          >
            {isPreviewLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Eye className="size-4" />
            )}
          </Button>
        )}
        {r.invoice_id && (
          <Button
            size="icon"
            variant="outline"
            className="h-10 w-10 shrink-0"
            aria-label="Télécharger la facture"
            title="Télécharger la facture"
            onClick={onDownload}
          >
            <FileDown className="size-4" />
          </Button>
        )}
        <Button size="sm" className="h-10 flex-1" onClick={onCollect}>
          <Wallet className="mr-1 size-3.5" />
          Encaisser
        </Button>
      </div>
    </div>
  );
}
