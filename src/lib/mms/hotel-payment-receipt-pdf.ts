import { jsPDF } from "jspdf";
import { PDF_COLORS } from "./PdfTheme";
import {
  createHotelPdf,
  formatHotelPdfDate,
  safeHotelPdfNumber,
  safeHotelPdfText,
} from "./hotel-pdf-engine";
import { formatMoney } from "./hotel-reservation-pdf-values";

export type HotelPaymentReceiptData = {
  paymentId: string;
  amount: number;
  method: string;
  paidAt: string;
  reference?: string | null;
  notes?: string | null;
  invoiceNumber?: string | null;
  guestName: string;
  guestPhone?: string | null;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  grandTotal: number;
  paidTotal: number;
  balanceDue: number;
};

const MARGIN = 12;
const CONTENT_WIDTH = 210 - MARGIN * 2;

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

function amountBanner(doc: jsPDF, amount: number, y: number) {
  const width = CONTENT_WIDTH;
  doc.setFillColor(...PDF_COLORS.primary);
  doc.roundedRect(MARGIN, y, width, 22, 3, 3, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("MONTANT ENCAISSÉ", MARGIN + 8, y + 9);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(formatMoney(amount), MARGIN + 8, y + 17.5);
  return y + 22;
}

function situation(doc: jsPDF, data: HotelPaymentReceiptData, y: number) {
  const width = 96;
  const x = 210 - MARGIN - width;
  const rows: Detail[] = [
    ["Montant total du séjour", formatMoney(data.grandTotal)],
    ["Total encaissé à ce jour", formatMoney(data.paidTotal)],
    ["Solde restant", formatMoney(Math.max(0, safeHotelPdfNumber(data.balanceDue)))],
  ];
  const rowHeight = 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text("SITUATION DU COMPTE", x, y + 5);
  doc.setDrawColor(...PDF_COLORS.secondary);
  doc.setLineWidth(0.6);
  doc.line(x, y + 8, x + width, y + 8);
  rows.forEach(([label, amount], index) => {
    const rowY = y + 11 + index * rowHeight;
    const emphasized = label === "Solde restant";
    doc.setFont("helvetica", emphasized ? "bold" : "normal");
    doc.setFontSize(emphasized ? 9 : 8.2);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(label, x, rowY + 6.5);
    doc.text(amount, x + width, rowY + 6.5, { align: "right", maxWidth: 46 });
    doc.setDrawColor(...PDF_COLORS.line);
    doc.setLineWidth(0.2);
    doc.line(x, rowY + rowHeight, x + width, rowY + rowHeight);
  });
  return y + 11 + rows.length * rowHeight;
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

export async function createHotelPaymentReceiptPdf(
  data: HotelPaymentReceiptData,
  settings?: Record<string, unknown> | null,
  logoUrl?: string | null,
) {
  const reference = `REC-${text(data.paymentId, "PAIEMENT")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 10)
    .toUpperCase()}`;
  const { doc, y: headerY } = await createHotelPdf("Reçu d'encaissement", settings, logoUrl, [
    { label: "Référence", value: reference },
    { label: "Date d'émission", value: formatHotelPdfDate(new Date()) },
  ]);
  const gap = 5;
  const blockWidth = (CONTENT_WIDTH - gap) / 2;
  const y = headerY + 2;
  const clientBottom = informationBlock(
    doc,
    "Client",
    [
      ["Nom du client", text(data.guestName)],
      ["Téléphone", text(data.guestPhone)],
    ],
    MARGIN,
    y,
    blockWidth,
  );
  const stayBottom = informationBlock(
    doc,
    "Séjour",
    [
      ["Logement", text(data.roomNumber)],
      ["Arrivée", formatHotelPdfDate(data.checkIn)],
      ["Départ", formatHotelPdfDate(data.checkOut)],
      ["Facture", text(data.invoiceNumber, "Non émise")],
    ],
    MARGIN + blockWidth + gap,
    y,
    blockWidth,
  );
  const bannerY = amountBanner(doc, data.amount, Math.max(clientBottom, stayBottom) + 6);
  informationBlock(
    doc,
    "Détails du paiement",
    [
      ["Mode de paiement", text(data.method)],
      ["Date de paiement", formatHotelPdfDate(data.paidAt)],
      ["Référence", text(data.reference, "—")],
      ["Note", text(data.notes, "—")],
    ],
    MARGIN,
    bannerY + 6,
    blockWidth,
  );
  situation(doc, data, bannerY + 6);
  footer(doc, reference);
  return { doc, number: reference, filename: `recu-${reference}.pdf` };
}
