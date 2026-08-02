import { jsPDF } from "jspdf";
import { PDF_COLORS } from "./PdfTheme";
import {
  createHotelPdf,
  formatHotelPdfDate,
  safeHotelPdfNumber,
  safeHotelPdfText,
} from "./hotel-pdf-engine";
import {
  formatMoney,
  reservationDiscountAmount,
  reservationPaymentStatus,
} from "./hotel-reservation-pdf-values";
export { formatMoney } from "./hotel-reservation-pdf-values";

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
  status: string;
  guestName: string;
  guestPhone?: string | null;
  companions?: string[];
  identityProvided?: boolean;
  roomNumber: string;
  notes?: string | null;
};

const MARGIN = 12;
const CONTENT_WIDTH = 210 - MARGIN * 2;
export const formatDate = (value: unknown) => {
  const formatted = formatHotelPdfDate(value);
  return /(?:â|Ã|undefined|null|NaN)/i.test(formatted) ? "—" : formatted;
};

function text(value: unknown, fallback = "—") {
  const plain = safeHotelPdfText(value, fallback)
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:#[0-9]+|#x[0-9a-f]+|[a-z][a-z0-9]+);?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain || fallback;
}

type Detail = [label: string, value: string];

function informationBlock(
  doc: jsPDF,
  title: string,
  rows: Detail[],
  x: number,
  y: number,
  width: number,
) {
  const rowHeight = 10;
  const height = 12 + rows.length * rowHeight;
  doc.setDrawColor(...PDF_COLORS.line);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, width, height, 2.5, 2.5, "FD");
  doc.setFillColor(...PDF_COLORS.primary);
  doc.roundedRect(x, y, width, 10, 2.5, 2.5, "F");
  doc.rect(x, y + 7, width, 3, "F");
  doc.setFillColor(...PDF_COLORS.secondary);
  doc.rect(x, y, 2.5, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(title.toUpperCase(), x + 7, y + 6.7);
  rows.forEach(([label, value], index) => {
    const rowY = y + 12 + index * rowHeight;
    if (index) {
      doc.setDrawColor(...PDF_COLORS.line);
      doc.line(x + 5, rowY, x + width - 5, rowY);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(label, x + 5, rowY + 6.2, { maxWidth: width * 0.42 });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(text(value), x + width - 5, rowY + 6.2, { align: "right", maxWidth: width * 0.54 });
  });
  return y + height;
}

export function reservationFinancialRows(invoice: HotelInvoiceData): Detail[] {
  const discount = reservationDiscountAmount(invoice.discount);
  return [
    ...(discount ? ([["Remise", discount]] as Detail[]) : []),
    ["Montant total", formatMoney(invoice.grand_total)],
    ["Avance versée", formatMoney(invoice.paid_total)],
    ["Solde restant", formatMoney(Math.max(0, safeHotelPdfNumber(invoice.balance_due)))],
  ];
}

function finances(doc: jsPDF, invoice: HotelInvoiceData, y: number) {
  const rows = reservationFinancialRows(invoice);
  const width = 96;
  const x = 210 - MARGIN - width;
  const rowHeight = 11;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text("SITUATION FINANCIÈRE", x, y + 5);
  doc.setDrawColor(...PDF_COLORS.secondary);
  doc.setLineWidth(0.6);
  doc.line(x, y + 8, x + width, y + 8);
  rows.forEach(([label, amount], index) => {
    const rowY = y + 11 + index * rowHeight;
    const emphasized = label === "Montant total" || label === "Solde restant";
    doc.setFont("helvetica", emphasized ? "bold" : "normal");
    doc.setFontSize(emphasized ? 9 : 8.2);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(label, x, rowY + 6.5);
    doc.text(amount, x + width, rowY + 6.5, { align: "right", maxWidth: 46 });
    doc.setDrawColor(...PDF_COLORS.line);
    doc.setLineWidth(0.2);
    doc.line(x, rowY + rowHeight, x + width, rowY + rowHeight);
  });
  const paid = safeHotelPdfNumber(invoice.paid_total);
  const balance = Math.max(0, safeHotelPdfNumber(invoice.balance_due));
  const payment = reservationPaymentStatus(paid, balance);
  const badgeColor: [number, number, number] =
    payment === "Soldé"
      ? [36, 122, 72]
      : payment === "Non payé"
        ? [151, 55, 55]
        : PDF_COLORS.secondary;
  const badgeY = y + 15 + rows.length * rowHeight;
  doc.setFillColor(...badgeColor);
  doc.roundedRect(x + width - 48, badgeY, 48, 9, 4.5, 4.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(payment.toUpperCase(), x + width - 24, badgeY + 6, { align: "center", maxWidth: 43 });
  return badgeY + 9;
}

function signatures(doc: jsPDF, y: number) {
  const gap = 6;
  const width = (CONTENT_WIDTH - gap * 2) / 3;
  ["Signature client", "Signature réception", "Cachet"].forEach((label, index) => {
    const x = MARGIN + index * (width + gap);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text(label.toUpperCase(), x + width / 2, y, { align: "center" });
    doc.setDrawColor(...PDF_COLORS.secondary);
    doc.setLineWidth(0.35);
    doc.line(x + 5, y + 24, x + width - 5, y + 24);
  });
}

function footer(doc: jsPDF, reference: string) {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...PDF_COLORS.secondary);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, height - 15, width - MARGIN, height - 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(reference, width / 2, height - 9, { align: "center" });
}

export async function createHotelInvoicePdf(
  invoice: HotelInvoiceData,
  settings?: Record<string, unknown> | null,
  logoUrl?: string | null,
) {
  const reference = `HOT-${text(invoice.id, "RESERVATION")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 10)
    .toUpperCase()}`;
  const { doc, y: headerY } = await createHotelPdf("Fiche de réservation", settings, logoUrl, [
    { label: "Référence", value: reference },
    { label: "Date d’émission", value: formatDate(new Date()) },
  ]);
  const gap = 5;
  const blockWidth = (CONTENT_WIDTH - gap) / 2;
  const y = headerY + 2;
  const clientBottom = informationBlock(
    doc,
    "Client",
    [
      ["Nom du client", text(invoice.guestName)],
      ["Téléphone", text(invoice.guestPhone)],
    ],
    MARGIN,
    y,
    blockWidth,
  );
  const stayBottom = informationBlock(
    doc,
    "Séjour",
    [
      ["Logement", text(invoice.roomNumber)],
      ["Date d’arrivée", formatDate(invoice.check_in)],
      ["Date de départ", formatDate(invoice.check_out)],
      ["Nombre de nuits", String(safeHotelPdfNumber(invoice.nights))],
      ["Tarif par nuit", formatMoney(invoice.nightly_rate)],
    ],
    MARGIN + blockWidth + gap,
    y,
    blockWidth,
  );
  const financialBottom = finances(doc, invoice, Math.max(clientBottom, stayBottom) + 9);
  signatures(doc, financialBottom + 18);
  footer(doc, reference);
  return { doc, number: reference, filename: `reservation-${reference}.pdf` };
}
