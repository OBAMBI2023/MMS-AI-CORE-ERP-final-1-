import { jsPDF } from "jspdf";
import { PDF_COLORS } from "./PdfTheme";
import { formatHotelPdfDate, hotelPdfTenant } from "./hotel-pdf-engine";
import {
  drawHotelIcon,
  ensureHotelFooterSpace,
  hotelDocText,
  hotelInfoBlockHeight,
  hotelStatusColor,
  renderHotelBadgeRow,
  renderHotelDocumentFooter,
  renderHotelDocumentHeader,
  renderHotelInfoBlock,
  HOTEL_CONTENT_WIDTH,
  HOTEL_MARGIN,
  type HotelDetailRow,
} from "./hotel-pdf-template";
import { safeHotelPdfNumber } from "./hotel-pdf-values";
import { formatMoney, reservationPaymentStatus } from "./hotel-reservation-pdf-values";

export type HotelPaymentReceiptData = {
  paymentId: string;
  amount: number;
  method: string | null;
  paidAt: string;
  reference?: string | null;
  notes?: string | null;
  invoiceNumber?: string | null;
  guestName: string;
  guestPhone?: string | null;
  guestEmail?: string | null;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  grandTotal: number;
  paidTotal: number;
  balanceDue: number;
};

function amountBanner(doc: jsPDF, amount: number, y: number): number {
  const width = HOTEL_CONTENT_WIDTH;
  doc.setFillColor(...PDF_COLORS.primary);
  doc.roundedRect(HOTEL_MARGIN, y, width, 22, 3, 3, "F");
  doc.setFillColor(...PDF_COLORS.secondary);
  doc.roundedRect(HOTEL_MARGIN, y, 2.5, 22, 1.5, 1.5, "F");
  drawHotelIcon(doc, "cash", HOTEL_MARGIN + 30, y + 11, 12, [255, 255, 255], PDF_COLORS.secondary);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("MONTANT ENCAISSÉ", HOTEL_MARGIN + 42, y + 9);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(formatMoney(amount), HOTEL_MARGIN + 42, y + 17.5);
  return y + 22;
}

/** "Reçu de paiement" — preuve d'un encaissement précis, sans table d'articles. */
export async function createHotelPaymentReceiptPdf(
  data: HotelPaymentReceiptData,
  settings?: Record<string, unknown> | null,
  logoUrl?: string | null,
  signatureUrl?: string | null,
  stampUrl?: string | null,
) {
  const reference = `REC-${hotelDocText(data.paymentId, "PAIEMENT")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 10)
    .toUpperCase()}`;
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  doc.setCharSpace(0);
  const tenant = hotelPdfTenant(settings, logoUrl);
  const rawSettings = settings as Record<string, unknown> | null | undefined;
  const emissionDate = formatHotelPdfDate(new Date());
  let y = await renderHotelDocumentHeader(doc, { ...tenant, website: undefined }, {
    type: "Reçu de paiement",
    number: reference,
    date: emissionDate,
  });

  y = renderHotelBadgeRow(
    doc,
    [
      { label: "Référence", value: reference },
      { label: "Date d'émission", value: emissionDate },
    ],
    y,
  ) + 7;

  const gap = 5;
  const blockWidth = (HOTEL_CONTENT_WIDTH - gap) / 2;
  const infoBlockHeight = Math.max(hotelInfoBlockHeight(3, "stackedFirst"), hotelInfoBlockHeight(4, "inline"));
  const clientBottom = renderHotelInfoBlock(
    doc,
    "Client",
    "person",
    [
      ["person", "Nom du client", hotelDocText(data.guestName)],
      ["phone", "Téléphone", hotelDocText(data.guestPhone)],
      ["mail", "Email", hotelDocText(data.guestEmail)],
    ],
    HOTEL_MARGIN,
    y,
    blockWidth,
    "stackedFirst",
    infoBlockHeight,
  );
  const stayX = HOTEL_MARGIN + blockWidth + gap;
  const stayBottom = renderHotelInfoBlock(
    doc,
    "Séjour",
    "calendar",
    [
      ["bed", "Logement", hotelDocText(data.roomNumber)],
      ["calendar", "Arrivée", formatHotelPdfDate(data.checkIn)],
      ["calendar", "Départ", formatHotelPdfDate(data.checkOut)],
      ["idcard", "Facture", hotelDocText(data.invoiceNumber, "Non émise")],
    ],
    stayX,
    y,
    blockWidth,
    "inline",
    infoBlockHeight,
  );

  const bannerY = amountBanner(doc, data.amount, Math.max(clientBottom, stayBottom) + 9);
  const detailY = ensureHotelFooterSpace(doc, bannerY + 6, 86);
  const detailBlockHeight = Math.max(hotelInfoBlockHeight(4, "inline"), hotelInfoBlockHeight(3, "inline"));

  const detailsBottom = renderHotelInfoBlock(
    doc,
    "Détails du paiement",
    "cash",
    [
      ["cash", "Mode de paiement", hotelDocText(data.method)],
      ["calendar", "Date de paiement", formatHotelPdfDate(data.paidAt)],
      ["idcard", "Référence", hotelDocText(data.reference, "—")],
      ["idcard", "Note", hotelDocText(data.notes, "—")],
    ],
    HOTEL_MARGIN,
    detailY,
    blockWidth,
    "inline",
    detailBlockHeight,
  );

  const balanceDue = Math.max(0, safeHotelPdfNumber(data.balanceDue));
  const status = reservationPaymentStatus(data.paidTotal, data.balanceDue);
  const situationRows: HotelDetailRow[] = [
    [null, "Montant total du séjour", formatMoney(data.grandTotal)],
    [null, "Total encaissé à ce jour", formatMoney(data.paidTotal)],
    [null, "Solde restant", formatMoney(balanceDue), hotelStatusColor(status)],
  ];
  const situationBottom = renderHotelInfoBlock(
    doc,
    "Situation du compte",
    "chart",
    situationRows,
    stayX,
    detailY,
    blockWidth,
    "inline",
    detailBlockHeight,
  );

  await renderHotelDocumentFooter(doc, {
    tenant,
    signatureUrl,
    stampUrl,
    contentBottom: Math.max(detailsBottom, situationBottom) + 16,
    legalInfo: {
      rccm: (rawSettings?.rccm as string | null) ?? null,
      taxNumber: (rawSettings?.tax_number as string | null) ?? null,
      website: tenant.website ?? null,
    },
  });

  return { doc, number: reference, filename: `recu-${reference}.pdf` };
}
