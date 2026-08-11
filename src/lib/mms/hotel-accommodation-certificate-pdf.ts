import { jsPDF } from "jspdf";
import { PDF_COLORS, type PdfTenant } from "./PdfTheme";
import { formatHotelPdfDate, hotelPdfTenant } from "./hotel-pdf-engine";
import {
  ensureHotelFooterSpace,
  hotelDocPersonName,
  hotelDocText,
  hotelInfoBlockHeight,
  renderHotelDocumentFooter,
  renderHotelDocumentHeader,
  renderHotelInfoBlock,
  HOTEL_CONTENT_WIDTH,
  HOTEL_MARGIN,
} from "./hotel-pdf-template";
import { safeHotelPdfNumber } from "./hotel-pdf-values";

/**
 * The certificate is exclusively a pre-arrival document (its wording promises a future stay), so
 * it can only be issued while the arrival date is still ahead of today — never on or after it.
 */
export const HOTEL_CERTIFICATE_DATE_ERROR =
  "La date d’émission du certificat doit être antérieure à la date d’arrivée du voyageur.";

/** Parses a "YYYY-MM-DD" date-only string as a local midnight Date, avoiding UTC offset drift. */
function parseHotelCertificateDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** True only when the certificate's issue date (today) is strictly before the reservation's arrival date. */
export function isHotelCertificateIssueDateValid(checkIn: string | null | undefined): boolean {
  const arrival = parseHotelCertificateDateOnly(checkIn);
  if (!arrival) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today < arrival;
}

export type HotelAccommodationCertificateData = {
  id: string;
  check_in: string;
  check_out: string;
  nights: number;
  roomNumber: string;
  guestName: string;
  guestNationality?: string | null;
  guestIdentityType?: string | null;
  guestIdentityNumber?: string | null;
  guestPhone?: string | null;
  guestEmail?: string | null;
};

function certificateReference(reservationId: string): string {
  return `CERT-${hotelDocText(reservationId, "RESERVATION")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 10)
    .toUpperCase()}`;
}

function reservationReference(reservationId: string): string {
  return `RES-${hotelDocText(reservationId, "RESERVATION")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 10)
    .toUpperCase()}`;
}

function identityLabel(type?: string | null, number?: string | null): string {
  const cleanType = hotelDocText(type, "");
  const cleanNumber = hotelDocText(number, "");
  if (!cleanType && !cleanNumber) return "Non renseignée";
  if (cleanType && cleanNumber) return `${cleanType} n° ${cleanNumber}`;
  return cleanType || cleanNumber;
}

function slugifyForFilename(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "voyageur";
}

/**
 * The accommodation certificate is always delivered before the guest's arrival (for visa/travel
 * formalities), so the wording is a single fixed future-tense attestation — it must never be
 * derived from today's date or the reservation's current status.
 */
function hotelCertificateStatementText(
  data: HotelAccommodationCertificateData,
  tenant: PdfTenant,
  reservationRef: string,
): string {
  const hotelName = hotelDocText(tenant.companyName, "l’établissement");
  const guestName = hotelDocPersonName(data.guestName);
  const arrivalDate = formatHotelPdfDate(data.check_in);
  const departureDate = formatHotelPdfDate(data.check_out);
  const roomName = hotelDocText(data.roomNumber);

  return (
    `Nous soussignés, la Direction de ${hotelName}, certifions par la présente que ${guestName} ` +
    `sera hébergé(e) dans notre établissement du ${arrivalDate} au ${departureDate}, dans le logement ` +
    `${roomName}, conformément à la réservation ${reservationRef}. Le présent certificat d’hébergement ` +
    `est délivré à l’intéressé(e) avant son arrivée afin de lui permettre d’accomplir les formalités ` +
    `administratives nécessaires à son voyage et à son séjour, et pour servir et valoir ce que de droit.`
  );
}

/** Formal attestation paragraph, styled like the confirmation PDF's "Conditions de réservation" block. */
function renderCertificateStatement(
  doc: jsPDF,
  title: string,
  text: string,
  x: number,
  y: number,
  width: number,
): number {
  const lines = doc.splitTextToSize(text, width - 10);
  const height = 12 + lines.length * 4.6;
  doc.setDrawColor(...PDF_COLORS.line);
  doc.setFillColor(...PDF_COLORS.surface);
  doc.roundedRect(x, y, width, height, 2.5, 2.5, "FD");
  doc.setFillColor(...PDF_COLORS.secondary);
  doc.rect(x, y, 2, height, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text(title.toUpperCase(), x + 6, y + 7);
  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(lines, x + 6, y + 14, { lineHeightFactor: 1.5 });
  return y + height;
}

/** "Certificat d'hébergement" — attestation officielle pré-arrivée remise au voyageur. */
export async function createHotelAccommodationCertificatePdf(
  data: HotelAccommodationCertificateData,
  settings?: Record<string, unknown> | null,
  logoUrl?: string | null,
  signatureUrl?: string | null,
  stampUrl?: string | null,
) {
  if (!isHotelCertificateIssueDateValid(data.check_in)) {
    throw new Error(HOTEL_CERTIFICATE_DATE_ERROR);
  }

  const reference = certificateReference(data.id);
  const reservationRef = reservationReference(data.id);
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  doc.setCharSpace(0);
  const tenant = hotelPdfTenant(settings, logoUrl);
  const rawSettings = settings as Record<string, unknown> | null | undefined;
  const issueDate = formatHotelPdfDate(new Date());
  const headerBottom = await renderHotelDocumentHeader(
    doc,
    tenant,
    { type: "Certificat d'hébergement", number: reference, date: issueDate },
    {
      rccm: (rawSettings?.rccm as string | null) ?? null,
      taxNumber: (rawSettings?.tax_number as string | null) ?? null,
    },
  );

  const gap = 5;
  const blockWidth = (HOTEL_CONTENT_WIDTH - gap) / 2;
  const infoBlockHeight = Math.max(
    hotelInfoBlockHeight(5, "stacked"),
    hotelInfoBlockHeight(5, "inline"),
  );
  const infoToStatementGap = 9;

  const statementText = hotelCertificateStatementText(data, tenant, reservationRef);
  const statementLines = doc.splitTextToSize(statementText, HOTEL_CONTENT_WIDTH - 10).length;
  const statementHeight = 12 + statementLines * 4.6;

  let y = headerBottom;
  const guestBottom = renderHotelInfoBlock(
    doc,
    "Voyageur",
    "person",
    [
      ["person", "Nom du voyageur", hotelDocPersonName(data.guestName)],
      ["globe", "Nationalité", hotelDocText(data.guestNationality)],
      [
        "idcard",
        "Pièce d’identité",
        identityLabel(data.guestIdentityType, data.guestIdentityNumber),
      ],
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
      ["idcard", "Référence réservation", reservationRef],
    ],
    stayX,
    y,
    blockWidth,
    "inline",
    infoBlockHeight,
  );

  y = Math.max(guestBottom, stayBottom) + infoToStatementGap;
  y = ensureHotelFooterSpace(doc, y, 46 + statementHeight);

  renderCertificateStatement(
    doc,
    "Formule officielle",
    statementText,
    HOTEL_MARGIN,
    y,
    HOTEL_CONTENT_WIDTH,
  );

  // No contentBottom override: the signature/cachet block, the "Merci de votre confiance" contact
  // block, and the discreet RCCM line stay anchored to their default near-bottom position (like the
  // invoice's footer) instead of trailing tightly behind the statement text.
  await renderHotelDocumentFooter(doc, {
    tenant,
    signatureUrl,
    stampUrl,
    thankYouMessage: "Merci de votre confiance.",
    legalInfo: {
      rccm: (rawSettings?.rccm as string | null) ?? null,
      taxNumber: (rawSettings?.tax_number as string | null) ?? null,
      website: tenant.website ?? null,
    },
  });

  const filename = `certificat-hebergement-${slugifyForFilename(data.guestName)}-${reservationRef}.pdf`;
  return { doc, number: reference, filename };
}
