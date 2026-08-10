import { jsPDF } from "jspdf";
import { PDF_COLORS } from "./PdfTheme";
import { formatHotelPdfDate, hotelPdfTenant } from "./hotel-pdf-engine";
import {
  ensureHotelFooterSpace,
  hotelDocText,
  hotelInfoBlockHeight,
  renderHotelDocumentFooter,
  renderHotelDocumentHeader,
  renderHotelEstimateCard,
  renderHotelInfoBlock,
  HOTEL_CONTENT_WIDTH,
  HOTEL_MARGIN,
} from "./hotel-pdf-template";
import { safeHotelPdfNumber } from "./hotel-pdf-values";
import { formatMoney } from "./hotel-reservation-pdf-values";

export type HotelReservationConfirmationData = {
  id: string;
  check_in: string;
  check_out: string;
  nights: number;
  nightly_rate: number;
  grand_total: number;
  paid_total: number;
  guestName: string;
  guestPhone?: string | null;
  guestEmail?: string | null;
  roomNumber: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  bookingTerms?: string | null;
  cancellationPolicy?: string | null;
};

function renderConditionsBlock(
  doc: jsPDF,
  title: string,
  text: string,
  x: number,
  y: number,
  width: number,
): number {
  const lines = doc.splitTextToSize(text, width - 10);
  const height = 12 + lines.length * 4.3;
  doc.setDrawColor(...PDF_COLORS.line);
  doc.setFillColor(...PDF_COLORS.surface);
  doc.roundedRect(x, y, width, height, 2.5, 2.5, "FD");
  doc.setFillColor(...PDF_COLORS.secondary);
  doc.rect(x, y, 2, height, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text(title.toUpperCase(), x + 6, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.3);
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(lines, x + 6, y + 13, { lineHeightFactor: 1.35 });
  return y + height;
}

/** "Confirmation de réservation" — remise au client au moment de la réservation, sans historique de paiements. */
export async function createHotelReservationConfirmationPdf(
  data: HotelReservationConfirmationData,
  settings?: Record<string, unknown> | null,
  logoUrl?: string | null,
  signatureUrl?: string | null,
) {
  const reference = `CONF-${hotelDocText(data.id, "RESERVATION")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 10)
    .toUpperCase()}`;
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  doc.setCharSpace(0);
  const tenant = hotelPdfTenant(settings, logoUrl);
  const rawSettings = settings as Record<string, unknown> | null | undefined;
  let y = await renderHotelDocumentHeader(
    doc,
    tenant,
    { type: "Confirmation de réservation", number: reference, date: formatHotelPdfDate(new Date()) },
    { rccm: (rawSettings?.rccm as string | null) ?? null, taxNumber: (rawSettings?.tax_number as string | null) ?? null },
  );

  const gap = 5;
  const blockWidth = (HOTEL_CONTENT_WIDTH - gap) / 2;
  const infoBlockHeight = Math.max(hotelInfoBlockHeight(3, "stacked"), hotelInfoBlockHeight(4, "inline"));
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
    "stacked",
    infoBlockHeight,
  );
  const stayX = HOTEL_MARGIN + blockWidth + gap;
  const stayBottom = renderHotelInfoBlock(
    doc,
    "Séjour",
    "calendar",
    [
      ["bed", "Logement", hotelDocText(data.roomNumber)],
      [
        "calendar",
        "Arrivée",
        `${formatHotelPdfDate(data.check_in)}${data.checkInTime ? ` à ${data.checkInTime.slice(0, 5)}` : ""}`,
      ],
      [
        "calendar",
        "Départ",
        `${formatHotelPdfDate(data.check_out)}${data.checkOutTime ? ` à ${data.checkOutTime.slice(0, 5)}` : ""}`,
      ],
      ["moon", "Nombre de nuits", String(safeHotelPdfNumber(data.nights))],
    ],
    stayX,
    y,
    blockWidth,
    "inline",
    infoBlockHeight,
  );

  y = Math.max(clientBottom, stayBottom) + 8;

  const paidTotal = safeHotelPdfNumber(data.paid_total);
  y =
    renderHotelEstimateCard(
      doc,
      "Estimation du séjour",
      [
        { label: "Tarif par nuit", value: formatMoney(data.nightly_rate) },
        { label: "Nombre de nuits", value: String(safeHotelPdfNumber(data.nights)) },
        ...(paidTotal > 0 ? [{ label: "Avance versée", value: formatMoney(paidTotal) }] : []),
        { label: "Total estimé", value: formatMoney(data.grand_total), kind: "highlight" as const },
      ],
      y,
    ) + 8;

  const conditions = [data.bookingTerms, data.cancellationPolicy].filter(Boolean) as string[];
  let contentBottom = y;
  if (conditions.length) {
    const text = conditions.join("\n\n");
    const lineCount = doc.splitTextToSize(text, HOTEL_CONTENT_WIDTH - 10).length;
    const blockHeight = 12 + lineCount * 4.3;
    y = ensureHotelFooterSpace(doc, y, 46 + blockHeight);
    contentBottom = renderConditionsBlock(doc, "Conditions de réservation", text, HOTEL_MARGIN, y, HOTEL_CONTENT_WIDTH);
  } else {
    y = ensureHotelFooterSpace(doc, y);
  }

  await renderHotelDocumentFooter(doc, {
    tenant,
    signatureUrl,
    thankYouMessage: "Nous avons hâte de vous accueillir.",
    contentBottom: contentBottom + 14,
    legalInfo: {
      rccm: (rawSettings?.rccm as string | null) ?? null,
      taxNumber: (rawSettings?.tax_number as string | null) ?? null,
      website: tenant.website ?? null,
    },
  });

  return { doc, number: reference, filename: `confirmation-${reference}.pdf` };
}
