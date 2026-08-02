import { jsPDF } from "jspdf";
import { PdfLayoutEngine } from "./PdfLayoutEngine";
import { PDF_COLORS } from "./PdfTheme";
import { createHotelPdf, finishHotelPdf, formatHotelPdfAmount, formatHotelPdfDate, safeHotelPdfNumber } from "./hotel-pdf-engine";

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

type InvoiceTotalRow = { label: string; value: string; status?: boolean };

function fitRightAlignedText(
  doc: jsPDF,
  text: string,
  rightX: number,
  baselineY: number,
  maxWidth: number,
  initialFontSize: number,
) {
  let fontSize = initialFontSize;
  doc.setCharSpace(0);
  doc.setFontSize(fontSize);
  while (fontSize > 6 && doc.getTextWidth(text) > maxWidth) {
    fontSize -= 0.25;
    doc.setFontSize(fontSize);
  }
  doc.text(text, rightX, baselineY, { align: "right" });
}

function renderHotelInvoiceTotals(doc: jsPDF, rows: InvoiceTotalRow[], requestedY: number) {
  const blockWidth = 82;
  const rowHeight = 8;
  const blockHeight = rows.length * rowHeight;
  let y = requestedY;
  if (y + blockHeight > doc.internal.pageSize.getHeight() - 26) {
    doc.addPage();
    y = 20;
  }

  const x = doc.internal.pageSize.getWidth() - 12 - blockWidth;
  const padding = 4;
  const contentWidth = blockWidth - padding * 2;
  const statusValueWidth = contentWidth * 0.45;
  const amountValueWidth = 38;
  const valueRightX = x + blockWidth - padding;

  rows.forEach((row, index) => {
    const rowY = y + index * rowHeight;
    const isStatus = row.status === true;
    doc.setFillColor(...(isStatus ? PDF_COLORS.primary : PDF_COLORS.surface));
    doc.setDrawColor(...(isStatus ? PDF_COLORS.primary : PDF_COLORS.line));
    doc.roundedRect(x, rowY, blockWidth, rowHeight, isStatus ? 2 : 0.8, isStatus ? 2 : 0.8, "FD");
    doc.setCharSpace(0);
    doc.setFont("helvetica", isStatus ? "bold" : "normal");
    doc.setFontSize(isStatus ? 8.5 : 8);
    doc.setTextColor(...(isStatus ? ([255, 255, 255] as [number, number, number]) : PDF_COLORS.text));
    doc.text(row.label.toUpperCase(), x + padding, rowY + 5.3, {
      maxWidth: isStatus ? contentWidth * 0.51 : contentWidth - amountValueWidth - 3,
    });
    fitRightAlignedText(
      doc,
      row.value,
      valueRightX,
      rowY + 5.3,
      isStatus ? statusValueWidth : amountValueWidth,
      isStatus ? 8.5 : 8,
    );
  });

  return y + blockHeight;
}

function renderSignatureArea(doc: jsPDF, requestedY: number) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const height = 34;
  let y = requestedY;
  if (y + height > pageHeight - 24) {
    doc.addPage();
    y = 20;
  }
  const width = 72;
  const x = pageWidth - 12 - width;
  doc.setDrawColor(...PDF_COLORS.line);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, width, height, 2, 2, "FD");
  doc.setTextColor(...PDF_COLORS.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("SIGNATURE / CACHET", x + width / 2, y + 7, { align: "center" });
  doc.setDrawColor(...PDF_COLORS.secondary);
  doc.line(x + 9, y + height - 7, x + width - 9, y + height - 7);
}

export async function createHotelInvoicePdf(
  invoice: HotelInvoiceData,
  settings?: Record<string, unknown> | null,
  logoUrl?: string | null,
) {
  const number = `HOT-${invoice.id.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  const { doc, tenant, y: headerY } = await createHotelPdf("Réservation", settings, logoUrl, [
    { label: "Numéro", value: number },
    { label: "Date", value: formatHotelPdfDate(new Date()) },
  ]);
  let y = headerY;
  y = PdfLayoutEngine.contact(
    doc,
    { heading: "Client", name: invoice.guestName, phone: invoice.guestPhone },
    y + 4,
  );
  y = PdfLayoutEngine.section(doc, "Détails du séjour", y + 7);
  y = PdfLayoutEngine.table(
    doc,
    ["Logement", "Arrivée", "Départ", "Nuits", "Tarif / nuit"],
    [
      [
        invoice.roomNumber,
        formatHotelPdfDate(invoice.check_in),
        formatHotelPdfDate(invoice.check_out),
        safeHotelPdfNumber(invoice.nights),
        formatHotelPdfAmount(invoice.nightly_rate),
      ],
    ],
    y + 2,
    {
      columnStyles: {
        1: { halign: "center" },
        2: { halign: "center" },
        3: { halign: "center" },
        4: { halign: "right" },
      },
    },
  );
  const paidTotal = safeHotelPdfNumber(invoice.paid_total);
  const paymentStatus =
    safeHotelPdfNumber(invoice.balance_due) <= 0
      ? "Payée"
      : paidTotal > 0
        ? "Partiellement payée"
        : "Non payée";
  const totalsY = renderHotelInvoiceTotals(
    doc,
    [
      { label: "Sous-total", value: formatHotelPdfAmount(safeHotelPdfNumber(invoice.nights) * safeHotelPdfNumber(invoice.nightly_rate)) },
      { label: "Remise", value: formatHotelPdfAmount(invoice.discount) },
      { label: "Avance", value: formatHotelPdfAmount(paidTotal) },
      { label: "Total", value: formatHotelPdfAmount(invoice.grand_total) },
      { label: "Montant payé", value: formatHotelPdfAmount(paidTotal) },
      { label: "Solde restant", value: formatHotelPdfAmount(Math.max(0, safeHotelPdfNumber(invoice.balance_due))) },
      { label: "Statut du paiement", value: paymentStatus, status: true },
    ],
    y + 8,
  );
  renderSignatureArea(doc, totalsY + 10);
  finishHotelPdf(doc, tenant);
  return { doc, number, filename: `reservation-${number}.pdf` };
}
