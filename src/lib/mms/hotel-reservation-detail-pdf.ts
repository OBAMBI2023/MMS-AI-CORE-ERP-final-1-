import { jsPDF } from "jspdf";
import { formatHotelPdfDate, hotelPdfTenant } from "./hotel-pdf-engine";
import {
  ensureHotelFooterSpace,
  hotelDocPersonName,
  hotelDocText,
  hotelInfoBlockHeight,
  renderHotelDocumentFooter,
  renderHotelDocumentHeader,
  renderHotelFinancialSummary,
  renderHotelInfoBlock,
  HOTEL_CONTENT_WIDTH,
  HOTEL_MARGIN,
} from "./hotel-pdf-template";
import { safeHotelPdfNumber } from "./hotel-pdf-values";
import { reservationPaymentStatus } from "./hotel-reservation-pdf-values";

export type HotelReservationDetailData = {
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
  guestEmail?: string | null;
  companions?: string[];
  identityProvided?: boolean;
  roomNumber: string;
  notes?: string | null;
};

/** "Détail de réservation" — fiche de séjour sans table d'articles ni historique de paiements. */
export async function createHotelReservationDetailPdf(
  data: HotelReservationDetailData,
  settings?: Record<string, unknown> | null,
  logoUrl?: string | null,
  signatureUrl?: string | null,
) {
  const reference = `RES-${hotelDocText(data.id, "RESERVATION")
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
    { type: "Détail de réservation", number: reference, date: formatHotelPdfDate(new Date()) },
    { rccm: (rawSettings?.rccm as string | null) ?? null, taxNumber: (rawSettings?.tax_number as string | null) ?? null },
  );

  const gap = 5;
  const blockWidth = (HOTEL_CONTENT_WIDTH - gap) / 2;
  const infoBlockHeight = Math.max(hotelInfoBlockHeight(3, "stacked"), hotelInfoBlockHeight(5, "inline"));
  const clientBottom = renderHotelInfoBlock(
    doc,
    "Client",
    "person",
    [
      ["person", "Nom du client", hotelDocPersonName(data.guestName)],
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
      ["calendar", "Date d’arrivée", formatHotelPdfDate(data.check_in)],
      ["calendar", "Date de départ", formatHotelPdfDate(data.check_out)],
      ["moon", "Nombre de nuits", String(safeHotelPdfNumber(data.nights))],
      ["idcard", "Pièce d’identité", data.identityProvided ? "Fournie" : "Non fournie"],
    ],
    stayX,
    y,
    blockWidth,
    "inline",
    infoBlockHeight,
  );
  const status = reservationPaymentStatus(data.paid_total, data.balance_due);

  y = Math.max(clientBottom, stayBottom) + 9;

  const companions = (data.companions ?? []).filter(Boolean);
  if (companions.length) {
    y =
      renderHotelInfoBlock(
        doc,
        "Accompagnants",
        "person",
        companions.map((name, index) => ["person", `Accompagnant ${index + 1}`, hotelDocPersonName(name)]),
        HOTEL_MARGIN,
        y,
        HOTEL_CONTENT_WIDTH,
        "inline",
      ) + 7;
  }
  y = ensureHotelFooterSpace(doc, y, 68);

  const grandTotal = safeHotelPdfNumber(data.grand_total);
  const discount = safeHotelPdfNumber(data.discount);
  const subtotal = grandTotal + discount;
  const paidTotal = safeHotelPdfNumber(data.paid_total);
  const balanceDue = Math.max(0, safeHotelPdfNumber(data.balance_due));
  const summaryBottom = renderHotelFinancialSummary(
    doc,
    { subtotal, discount, grandTotal, paidTotal, balanceDue, status },
    y,
  );

  await renderHotelDocumentFooter(doc, {
    tenant,
    signatureUrl,
    thankYouMessage: "Merci de votre confiance.",
    contentBottom: summaryBottom + 10,
    legalNotice: false,
  });

  return { doc, number: reference, filename: `reservation-${reference}.pdf` };
}
