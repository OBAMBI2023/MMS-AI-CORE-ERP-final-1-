import { jsPDF } from "jspdf";
import { PDF_COLORS, type PdfTenant } from "./PdfTheme";
import { formatHotelPdfDate, hotelPdfTenant } from "./hotel-pdf-engine";
import {
  ensureHotelFooterSpace,
  hotelDocPersonName,
  hotelDocText,
  hotelInfoBlockHeight,
  renderHotelDocumentHeader,
  renderHotelInfoBlock,
  renderHotelSignatureBox,
  HOTEL_CONTENT_WIDTH,
  HOTEL_MARGIN,
  HOTEL_PAGE_WIDTH,
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
 * formalities), so the wording is a fixed future-tense attestation — it must never be derived
 * from today's date or the reservation's current status. Returned as separate paragraphs (rather
 * than one fused sentence) so the closing "Fait pour servir..." line can get its own spacing.
 */
function hotelCertificateStatementParagraphs(
  data: HotelAccommodationCertificateData,
  tenant: PdfTenant,
  reservationRef: string,
): [string, string, string] {
  const hotelName = hotelDocText(tenant.companyName, "l’établissement");
  const guestName = hotelDocPersonName(data.guestName);
  const arrivalDate = formatHotelPdfDate(data.check_in);
  const departureDate = formatHotelPdfDate(data.check_out);
  const roomName = hotelDocText(data.roomNumber);

  return [
    `Nous soussignés, la Direction de ${hotelName}, certifions par la présente que ${guestName} ` +
      `sera hébergé(e) dans notre établissement, au ${roomName}, du ${arrivalDate} au ${departureDate}, ` +
      `conformément à la réservation ${reservationRef}.`,
    `Le présent certificat d’hébergement est délivré à l’intéressé(e), à sa demande, afin de lui ` +
      `permettre d’accomplir les formalités administratives nécessaires à son voyage et à son séjour.`,
    `Fait pour servir et valoir ce que de droit.`,
  ];
}

const CERTIFICATE_STATEMENT_LINE_HEIGHT = 4.6;
const CERTIFICATE_STATEMENT_PARAGRAPH_GAP = 3;
const CERTIFICATE_STATEMENT_FINAL_GAP = 6;
const CERTIFICATE_STATEMENT_PADDING_TOP = 8;
const CERTIFICATE_STATEMENT_PADDING_BOTTOM = 7;

function certificateStatementGapBefore(index: number, count: number): number {
  if (index === 0) return 0;
  return index === count - 1
    ? CERTIFICATE_STATEMENT_FINAL_GAP
    : CERTIFICATE_STATEMENT_PARAGRAPH_GAP;
}

/** Total card height for a given set of wrapped paragraphs — shared by the page-break check and the renderer so they can never drift apart. */
function measureCertificateStatementHeight(
  doc: jsPDF,
  paragraphs: string[],
  width: number,
): number {
  const innerWidth = width - 12;
  const wrapped = paragraphs.map((paragraph) => doc.splitTextToSize(paragraph, innerWidth));
  const bodyHeight = wrapped.reduce(
    (sum, lines, index) =>
      sum +
      certificateStatementGapBefore(index, wrapped.length) +
      lines.length * CERTIFICATE_STATEMENT_LINE_HEIGHT,
    0,
  );
  return CERTIFICATE_STATEMENT_PADDING_TOP + bodyHeight + CERTIFICATE_STATEMENT_PADDING_BOTTOM;
}

/**
 * Formal attestation paragraphs, shown directly under the Voyageur/Séjour cards with no
 * intermediate title — just the administrative text itself, styled like the confirmation PDF's
 * "Conditions de réservation" block (light card, gold left accent).
 */
function renderCertificateStatement(
  doc: jsPDF,
  paragraphs: string[],
  x: number,
  y: number,
  width: number,
): number {
  const innerWidth = width - 12;
  const height = measureCertificateStatementHeight(doc, paragraphs, width);
  doc.setDrawColor(...PDF_COLORS.line);
  doc.setFillColor(...PDF_COLORS.surface);
  doc.roundedRect(x, y, width, height, 2.5, 2.5, "FD");
  doc.setFillColor(...PDF_COLORS.secondary);
  doc.rect(x, y, 2, height, "F");
  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.text);

  const wrapped = paragraphs.map((paragraph) => doc.splitTextToSize(paragraph, innerWidth));
  let cursorY = y + CERTIFICATE_STATEMENT_PADDING_TOP;
  wrapped.forEach((lines, index) => {
    cursorY += certificateStatementGapBefore(index, wrapped.length);
    doc.text(lines, x + 6, cursorY, { lineHeightFactor: 1.5, maxWidth: innerWidth });
    cursorY += lines.length * CERTIFICATE_STATEMENT_LINE_HEIGHT;
  });

  return y + height;
}

/**
 * Certificate-only footer: "Fait à {ville}, le {date}." + "Pour la Direction de {hôtel}." on
 * the left, Signature/Cachet side by side on the right, a thin gold rule, then a compact
 * administrative strip (reception contact, "document établi électroniquement"). Deliberately
 * not the shared `renderHotelDocumentFooter` — this wording/structure ("Fait à/le", an
 * authority line, no "Merci de votre confiance") is specific to the certificate and would only
 * complicate the shared helper's options for no benefit to the other three documents, which
 * keep using it unchanged.
 */
async function renderCertificateFooter(
  doc: jsPDF,
  params: {
    tenant: PdfTenant;
    city: string | null;
    issueDate: string;
    signatureUrl?: string | null;
    stampUrl?: string | null;
  },
): Promise<void> {
  const { tenant, city, issueDate, signatureUrl, stampUrl } = params;
  const width = HOTEL_PAGE_WIDTH;
  const height = doc.internal.pageSize.getHeight();
  const margin = HOTEL_MARGIN;

  const hasSignature = Boolean(signatureUrl);
  const hasStamp = Boolean(stampUrl);
  const boxWidth = 52;
  const boxHeight = 23;
  const boxX = width - margin - boxWidth;
  const titleSpace = 6.5;

  // Fixed 58mm bottom reserve: comfortably fits the two-tier layout (identity band + gold
  // rule + contact/legal strip) with a clear margin from the page edge — every gap below is
  // deliberately generous after the earlier "gold rule cuts through the text" bug.
  const topY = height - 58;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_COLORS.text);
  const madeAtLabel = city ? `Fait à ${city}, le ${issueDate}.` : `Fait le ${issueDate}.`;
  doc.text(madeAtLabel, margin, topY + 5, { maxWidth: boxX - margin - 8 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.6);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(
    `Pour la Direction de ${hotelDocText(tenant.companyName, "l’établissement")}.`,
    margin,
    topY + 11,
    { maxWidth: boxX - margin - 8 },
  );

  let boxBottom = topY + 14;
  if (hasSignature && hasStamp) {
    const boxGap = 2;
    const halfWidth = (boxWidth - boxGap) / 2;
    await renderHotelSignatureBox(
      doc,
      boxX,
      topY,
      halfWidth,
      boxHeight,
      titleSpace,
      "SIGNATURE",
      signatureUrl!,
    );
    await renderHotelSignatureBox(
      doc,
      boxX + halfWidth + boxGap,
      topY,
      halfWidth,
      boxHeight,
      titleSpace,
      "CACHET",
      stampUrl!,
    );
    boxBottom = topY + boxHeight;
  } else if (hasSignature) {
    await renderHotelSignatureBox(
      doc,
      boxX,
      topY,
      boxWidth,
      boxHeight,
      titleSpace,
      "SIGNATURE",
      signatureUrl!,
    );
    boxBottom = topY + boxHeight;
  } else if (hasStamp) {
    await renderHotelSignatureBox(doc, boxX, topY, boxWidth, boxHeight, titleSpace, "CACHET", stampUrl!);
    boxBottom = topY + boxHeight;
  }

  const lineY = Math.max(topY + 14, boxBottom) + 6;
  doc.setDrawColor(...PDF_COLORS.secondary);
  doc.setLineWidth(0.4);
  doc.line(margin, lineY, width - margin, lineY);

  const contactValues = [tenant.phone, tenant.email].filter(
    (value): value is string => Boolean(value && value.trim()),
  );
  const contactLine = contactValues.length ? `Réception : ${contactValues.join(" · ")}` : null;

  let textY = lineY + 6;
  doc.setFont("helvetica", "normal");
  if (contactLine) {
    doc.setFontSize(7);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(contactLine, width / 2, textY, { align: "center" });
    textY += 4.4;
  }
  doc.setFontSize(6.4);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text("Document établi électroniquement par l’établissement.", width / 2, textY, {
    align: "center",
  });
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

  const statementParagraphs = hotelCertificateStatementParagraphs(data, tenant, reservationRef);
  const statementHeight = measureCertificateStatementHeight(
    doc,
    statementParagraphs,
    HOTEL_CONTENT_WIDTH,
  );

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
  // 58mm reserve matches renderCertificateFooter's own fixed bottom band, so a long statement
  // never gets pinned so low it collides with the footer instead of flowing to a new page.
  y = ensureHotelFooterSpace(doc, y, 58 + statementHeight);

  renderCertificateStatement(doc, statementParagraphs, HOTEL_MARGIN, y, HOTEL_CONTENT_WIDTH);

  await renderCertificateFooter(doc, {
    tenant,
    city: (rawSettings?.city as string | null) ?? null,
    issueDate,
    signatureUrl,
    stampUrl,
  });

  const filename = `certificat-hebergement-${slugifyForFilename(data.guestName)}-${reservationRef}.pdf`;
  return { doc, number: reference, filename };
}
