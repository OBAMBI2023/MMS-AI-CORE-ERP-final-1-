import { jsPDF } from "jspdf";
import { PdfLayoutEngine } from "./PdfLayoutEngine";
import { formatPdfCurrency, formatPdfDate, tenantFromSettings } from "./PdfTheme";

export type HotelInvoiceData = {
  id: string;
  check_in: string;
  check_out: string;
  nights: number;
  nightly_rate: number;
  discount: number;
  grand_total: number;
  paid_total: number;
  balance_due: number;
  guestName: string;
  guestPhone?: string | null;
  roomNumber: string;
};

export async function createHotelInvoicePdf(
  invoice: HotelInvoiceData,
  settings?: Record<string, unknown> | null,
  logoUrl?: string | null,
) {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const tenant = tenantFromSettings(settings, logoUrl);
  const number = `HOT-${invoice.id.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  let y = await PdfLayoutEngine.header(doc, tenant, "Facture", [
    { label: "Numéro", value: number },
    { label: "Date", value: formatPdfDate() },
  ]);
  y = PdfLayoutEngine.contact(
    doc,
    { heading: "Client", name: invoice.guestName, phone: invoice.guestPhone },
    y + 4,
  );
  y = PdfLayoutEngine.section(doc, "Détails du séjour", y + 7);
  y = PdfLayoutEngine.table(
    doc,
    ["Chambre", "Arrivée", "Départ", "Nuits", "Tarif / nuit"],
    [
      [
        invoice.roomNumber,
        formatPdfDate(invoice.check_in),
        formatPdfDate(invoice.check_out),
        invoice.nights,
        formatPdfCurrency(invoice.nightly_rate),
      ],
    ],
    y + 2,
  );
  const paymentStatus =
    invoice.balance_due <= 0
      ? "Payée"
      : invoice.paid_total > 0
        ? "Partiellement payée"
        : "Non payée";
  PdfLayoutEngine.totals(
    doc,
    [
      { label: "Sous-total", value: formatPdfCurrency(invoice.nights * invoice.nightly_rate) },
      { label: "Remise", value: formatPdfCurrency(invoice.discount) },
      { label: "Montant total", value: formatPdfCurrency(invoice.grand_total) },
      { label: "Montant payé", value: formatPdfCurrency(invoice.paid_total) },
      { label: "Solde restant", value: formatPdfCurrency(Math.max(0, invoice.balance_due)) },
      { label: "Statut du paiement", value: paymentStatus },
    ],
    y + 8,
  );
  PdfLayoutEngine.footer(doc, tenant);
  return { doc, number, filename: `facture-${number}.pdf` };
}
