import { jsPDF } from "jspdf";
import { PDF_COLORS, imageData, type PdfTenant } from "./PdfTheme";
import { hotelPdfTable, type HotelPdfCell } from "./hotel-pdf-engine";
import { safeHotelPdfText } from "./hotel-pdf-values";
import { formatMoney } from "./hotel-reservation-pdf-values";

/**
 * Shared premium layout for SAOVIA HOTEL documents (facture, reçu,
 * confirmation et détail de réservation). Navy/gold palette reused from
 * PDF_COLORS — no colors are redefined here so all HOTEL documents stay
 * visually consistent with the rest of the ERP.
 */

export const HOTEL_MARGIN = 12;
export const HOTEL_PAGE_WIDTH = 210;
export const HOTEL_CONTENT_WIDTH = HOTEL_PAGE_WIDTH - HOTEL_MARGIN * 2;

const HOTEL_STATUS_COLORS: Record<string, [number, number, number]> = {
  "Soldé": [36, 122, 72],
  "Partiellement payé": [217, 119, 6],
  "Non payé": [151, 55, 55],
};

export function hotelStatusColor(status: string): [number, number, number] {
  return HOTEL_STATUS_COLORS[status] ?? PDF_COLORS.muted;
}

/**
 * The footer (thank-you/contact/signature/legal strip) reserves ~46mm at the
 * bottom of the page. Content that would flow into that zone starts a fresh
 * page instead of overlapping it.
 */
export function ensureHotelFooterSpace(doc: jsPDF, y: number, minSpace = 46): number {
  const height = doc.internal.pageSize.getHeight();
  if (y > height - minSpace) {
    doc.addPage();
    return 20;
  }
  return y;
}

export function hotelDocText(value: unknown, fallback = "—"): string {
  const plain = safeHotelPdfText(value, fallback)
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:#[0-9]+|#x[0-9a-f]+|[a-z][a-z0-9]+);?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain || fallback;
}

/** Same as {@link hotelDocText} but normalizes case (e.g. "bamba FANTA" → "Bamba Fanta") for person names. */
export function hotelDocPersonName(value: unknown, fallback = "—"): string {
  const text = hotelDocText(value, fallback);
  if (text === fallback) return text;
  return text.toLowerCase().replace(/\p{L}+/gu, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}

function tenantInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "SH"
  );
}

/* ------------------------------------------------------------------------ */
/* Minimal vector icon set — geometric approximations built only from jsPDF */
/* primitives (no external assets/fonts) so the layout stays self-contained. */
/* ------------------------------------------------------------------------ */

export type HotelIconType =
  | "pin"
  | "phone"
  | "mail"
  | "globe"
  | "idcard"
  | "person"
  | "calendar"
  | "moon"
  | "bed"
  | "clock"
  | "medal"
  | "cash"
  | "check"
  | "cross"
  | "shield"
  | "bell"
  | "chart"
  | "building";

export function drawHotelIcon(
  doc: jsPDF,
  type: HotelIconType,
  cx: number,
  cy: number,
  size: number,
  color: [number, number, number],
  badge?: [number, number, number],
) {
  const r = size / 2;
  if (badge) {
    doc.setFillColor(...badge);
    doc.circle(cx, cy, r, "F");
  }
  doc.setDrawColor(...color);
  doc.setFillColor(...color);
  doc.setLineWidth(Math.max(0.22, size * 0.09));
  switch (type) {
    case "pin":
      doc.circle(cx, cy - r * 0.15, r * 0.5, "F");
      doc.triangle(cx - r * 0.32, cy, cx + r * 0.32, cy, cx, cy + r * 0.65, "F");
      break;
    case "phone":
      doc.roundedRect(cx - r * 0.3, cy - r * 0.55, r * 0.6, r * 1.1, r * 0.16, r * 0.16, "F");
      break;
    case "mail":
      doc.roundedRect(cx - r * 0.62, cy - r * 0.42, r * 1.24, r * 0.84, r * 0.1, r * 0.1, "S");
      doc.line(cx - r * 0.58, cy - r * 0.36, cx, cy + r * 0.08);
      doc.line(cx, cy + r * 0.08, cx + r * 0.58, cy - r * 0.36);
      break;
    case "globe":
      doc.circle(cx, cy, r * 0.62, "S");
      doc.ellipse(cx, cy, r * 0.26, r * 0.62, "S");
      doc.line(cx - r * 0.6, cy, cx + r * 0.6, cy);
      break;
    case "idcard":
      doc.roundedRect(cx - r * 0.62, cy - r * 0.45, r * 1.24, r * 0.9, r * 0.1, r * 0.1, "S");
      doc.circle(cx - r * 0.3, cy - r * 0.02, r * 0.16, "F");
      doc.line(cx, cy - r * 0.15, cx + r * 0.48, cy - r * 0.15);
      doc.line(cx, cy + r * 0.12, cx + r * 0.48, cy + r * 0.12);
      break;
    case "person":
      doc.circle(cx, cy - r * 0.32, r * 0.34, "F");
      doc.triangle(cx - r * 0.55, cy + r * 0.55, cx + r * 0.55, cy + r * 0.55, cx, cy - r * 0.02, "F");
      break;
    case "calendar":
      doc.roundedRect(cx - r * 0.62, cy - r * 0.5, r * 1.24, r * 1.0, r * 0.1, r * 0.1, "S");
      doc.line(cx - r * 0.62, cy - r * 0.18, cx + r * 0.62, cy - r * 0.18);
      doc.rect(cx - r * 0.18, cy + r * 0.02, r * 0.36, r * 0.28, "F");
      break;
    case "moon":
      doc.circle(cx, cy, r * 0.55, "F");
      doc.setFillColor(255, 255, 255);
      doc.circle(cx + r * 0.26, cy - r * 0.14, r * 0.48, "F");
      break;
    case "bed":
      doc.roundedRect(cx - r * 0.6, cy, r * 1.2, r * 0.5, r * 0.1, r * 0.1, "F");
      doc.roundedRect(cx - r * 0.62, cy - r * 0.5, r * 0.22, r * 0.6, r * 0.06, r * 0.06, "F");
      doc.circle(cx + r * 0.05, cy - r * 0.18, r * 0.16, "F");
      break;
    case "clock":
      doc.circle(cx, cy, r * 0.62, "S");
      doc.line(cx, cy, cx, cy - r * 0.36);
      doc.line(cx, cy, cx + r * 0.28, cy + r * 0.12);
      break;
    case "medal":
      doc.circle(cx, cy - r * 0.1, r * 0.55, "F");
      doc.setFillColor(255, 255, 255);
      doc.circle(cx, cy - r * 0.1, r * 0.26, "F");
      doc.setFillColor(...color);
      doc.triangle(cx - r * 0.4, cy + r * 0.3, cx - r * 0.1, cy + r * 0.3, cx - r * 0.25, cy + r * 0.85, "F");
      doc.triangle(cx + r * 0.1, cy + r * 0.3, cx + r * 0.4, cy + r * 0.3, cx + r * 0.25, cy + r * 0.85, "F");
      break;
    case "cash":
      doc.roundedRect(cx - r * 0.65, cy - r * 0.4, r * 1.3, r * 0.8, r * 0.1, r * 0.1, "S");
      doc.circle(cx, cy, r * 0.2, "S");
      break;
    case "check":
      doc.setLineWidth(Math.max(0.32, size * 0.13));
      doc.line(cx - r * 0.5, cy, cx - r * 0.08, cy + r * 0.4);
      doc.line(cx - r * 0.08, cy + r * 0.4, cx + r * 0.55, cy - r * 0.4);
      break;
    case "cross":
      doc.setLineWidth(Math.max(0.32, size * 0.13));
      doc.line(cx - r * 0.4, cy - r * 0.4, cx + r * 0.4, cy + r * 0.4);
      doc.line(cx - r * 0.4, cy + r * 0.4, cx + r * 0.4, cy - r * 0.4);
      break;
    case "shield":
      doc.triangle(cx - r * 0.55, cy - r * 0.5, cx + r * 0.55, cy - r * 0.5, cx + r * 0.55, cy + r * 0.05, "F");
      doc.triangle(cx - r * 0.55, cy - r * 0.5, cx - r * 0.55, cy + r * 0.05, cx + r * 0.55, cy + r * 0.05, "F");
      doc.triangle(cx - r * 0.55, cy + r * 0.05, cx + r * 0.55, cy + r * 0.05, cx, cy + r * 0.6, "F");
      break;
    case "bell":
      doc.ellipse(cx, cy - r * 0.05, r * 0.5, r * 0.45, "F");
      doc.rect(cx - r * 0.5, cy - r * 0.05, r * 1.0, r * 0.35, "F");
      doc.roundedRect(cx - r * 0.55, cy + r * 0.28, r * 1.1, r * 0.18, r * 0.06, r * 0.06, "F");
      doc.circle(cx, cy - r * 0.62, r * 0.12, "F");
      break;
    case "chart":
      doc.setLineWidth(Math.max(0.3, size * 0.1));
      doc.circle(cx, cy, r * 0.62, "S");
      doc.triangle(cx, cy, cx, cy - r * 0.62, cx + r * 0.55, cy - r * 0.15, "F");
      break;
    case "building":
      doc.roundedRect(cx - r * 0.45, cy - r * 0.6, r * 0.9, r * 1.2, r * 0.08, r * 0.08, "S");
      doc.rect(cx - r * 0.28, cy - r * 0.36, r * 0.16, r * 0.16, "F");
      doc.rect(cx + r * 0.12, cy - r * 0.36, r * 0.16, r * 0.16, "F");
      doc.rect(cx - r * 0.28, cy - r * 0.04, r * 0.16, r * 0.16, "F");
      doc.rect(cx + r * 0.12, cy - r * 0.04, r * 0.16, r * 0.16, "F");
      doc.rect(cx - r * 0.12, cy + r * 0.28, r * 0.24, r * 0.32, "F");
      break;
  }
}

export type HotelDocumentMeta = { type: string; number: string; date: string };
export type HotelLegalInfo = { rccm?: string | null; taxNumber?: string | null };

/**
 * Header: tenant identity on the left (logo, name, activité, adresse,
 * téléphone, email, site internet, RCCM/N° contribuable — each row shown
 * only when the tenant field is actually filled in), document type/number/
 * date in a navy card on the right.
 */
export async function renderHotelDocumentHeader(
  doc: jsPDF,
  tenant: PdfTenant,
  meta: HotelDocumentMeta,
  legal?: HotelLegalInfo,
): Promise<number> {
  const margin = HOTEL_MARGIN;
  const logoSize = 20;
  const boxWidth = 62;
  const boxX = HOTEL_PAGE_WIDTH - margin - boxWidth;
  const textX = margin + logoSize + 6;
  const textMaxWidth = boxX - textX - 6;

  let logoRendered = false;
  if (tenant.logoUrl) {
    try {
      const data = await imageData(tenant.logoUrl);
      const properties = doc.getImageProperties(data);
      const ratio = properties.width / properties.height;
      let w = logoSize;
      let h = w / ratio;
      if (h > logoSize) {
        h = logoSize;
        w = h * ratio;
      }
      doc.setDrawColor(...PDF_COLORS.secondary);
      doc.setLineWidth(0.5);
      doc.circle(margin + logoSize / 2, 12 + logoSize / 2, logoSize / 2 + 0.8, "S");
      doc.addImage(data, properties.fileType || "PNG", margin + (logoSize - w) / 2, 12 + (logoSize - h) / 2, w, h);
      logoRendered = true;
    } catch (error) {
      console.warn("Logo PDF indisponible, utilisation des initiales.", error);
    }
  }
  if (!logoRendered) {
    doc.setDrawColor(...PDF_COLORS.secondary);
    doc.setLineWidth(0.5);
    doc.setFillColor(...PDF_COLORS.surface);
    doc.circle(margin + logoSize / 2, 12 + logoSize / 2, logoSize / 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text(tenantInitials(tenant.companyName), margin + logoSize / 2, 12 + logoSize / 2 + 1.5, {
      align: "center",
    });
  }

  doc.setTextColor(...PDF_COLORS.primary);
  doc.setFont("times", "bold");
  doc.setFontSize(15);
  doc.text(hotelDocText(tenant.companyName, "Établissement").toUpperCase(), textX, 18, {
    maxWidth: textMaxWidth,
  });

  let cursorY = 18;
  if (tenant.businessSector) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...PDF_COLORS.secondary);
    doc.setCharSpace(1.1);
    doc.text(tenant.businessSector.toUpperCase(), textX, 23, { maxWidth: textMaxWidth });
    doc.setCharSpace(0);
    cursorY = 23;
  }

  const rows: Array<[HotelIconType, string]> = [];
  if (tenant.address) rows.push(["pin", tenant.address]);
  if (tenant.phone) rows.push(["phone", tenant.phone]);
  if (tenant.email) rows.push(["mail", tenant.email]);
  if (tenant.website) rows.push(["globe", tenant.website]);
  const legalLine = [
    legal?.rccm ? `RCCM : ${legal.rccm}` : "",
    legal?.taxNumber ? `N° Contribuable : ${legal.taxNumber}` : "",
  ]
    .filter(Boolean)
    .join("   •   ");
  if (legalLine) rows.push(["idcard", legalLine]);

  const rowGap = 4.7;
  let rowY = cursorY + 5.5;
  rows.forEach(([icon, text]) => {
    drawHotelIcon(doc, icon, textX + 1.6, rowY - 1.4, 3.4, PDF_COLORS.primary);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.3);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(text, textX + 5.5, rowY, { maxWidth: textMaxWidth - 5.5 });
    rowY += rowGap;
  });
  const leftBottom = rows.length ? rowY - rowGap + 3 : cursorY + 4;

  const boxHeight = 27;
  doc.setFillColor(...PDF_COLORS.primary);
  doc.roundedRect(boxX, 10, boxWidth, boxHeight, 3, 3, "F");
  doc.setFillColor(...PDF_COLORS.secondary);
  doc.roundedRect(boxX, 10, 3, boxHeight, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(doc.splitTextToSize(meta.type.toUpperCase(), boxWidth - 12).slice(0, 2), boxX + 8, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.3);
  doc.setTextColor(...PDF_COLORS.secondary);
  doc.text(`N° ${meta.number}`, boxX + 8, 26.5);
  drawHotelIcon(doc, "calendar", boxX + 9.5, 30.2, 3.2, [255, 255, 255]);
  doc.setTextColor(255, 255, 255);
  doc.text(meta.date, boxX + 13.5, 31.5);

  const dividerY = Math.max(10 + boxHeight, leftBottom) + 5;
  doc.setDrawColor(...PDF_COLORS.secondary);
  doc.setLineWidth(0.5);
  doc.line(margin, dividerY, HOTEL_PAGE_WIDTH - margin, dividerY);
  return dividerY + 6;
}

export type HotelDetailRow = [
  icon: HotelIconType | null,
  label: string,
  value: string,
  emphasis?: [number, number, number],
];
export type HotelInfoBlockMode = "inline" | "stacked" | "stackedFirst";

/** Natural height of an info block for a given row count — lets two side-by-side blocks share the same card height. */
export function hotelInfoBlockHeight(rowCount: number, mode: HotelInfoBlockMode = "inline"): number {
  const headerHeight = 10;
  const rowHeight = mode === "inline" ? 10 : 13;
  return headerHeight + 2 + rowCount * rowHeight;
}

/** Rounded info card used for the client and stay sections. */
export function renderHotelInfoBlock(
  doc: jsPDF,
  title: string,
  headerIcon: HotelIconType,
  rows: HotelDetailRow[],
  x: number,
  y: number,
  width: number,
  mode: HotelInfoBlockMode = "inline",
  minHeight = 0,
): number {
  const headerHeight = 10;
  const rowHeight = mode === "inline" ? 10 : 13;
  const height = Math.max(minHeight, headerHeight + 2 + rows.length * rowHeight);
  doc.setDrawColor(...PDF_COLORS.line);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, width, height, 2.5, 2.5, "FD");
  doc.setFillColor(...PDF_COLORS.primary);
  doc.roundedRect(x, y, width, headerHeight, 2.5, 2.5, "F");
  doc.rect(x, y + headerHeight - 3, width, 3, "F");
  drawHotelIcon(doc, headerIcon, x + 8, y + headerHeight / 2, 4.2, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(title.toUpperCase(), x + 13, y + headerHeight / 2 + 1.2);

  rows.forEach(([rowIcon, label, value, emphasis], index) => {
    const rowY = y + headerHeight + 2 + index * rowHeight;
    if (index) {
      doc.setDrawColor(...PDF_COLORS.line);
      doc.line(x + 6, rowY, x + width - 6, rowY);
    }
    if (rowIcon) {
      drawHotelIcon(doc, rowIcon, x + 10, rowY + rowHeight / 2, 4.6, PDF_COLORS.primary, [246, 248, 252]);
    }
    const textX = x + 17;
    const useStacked = mode === "stacked" || (mode === "stackedFirst" && index === 0);
    if (useStacked) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(...PDF_COLORS.muted);
      doc.text(label, textX, rowY + rowHeight * 0.4, { maxWidth: width - 24 });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.6);
      doc.setTextColor(...(emphasis ?? PDF_COLORS.text));
      doc.text(hotelDocText(value), textX, rowY + rowHeight * 0.78, { maxWidth: width - 24 });
    } else {
      doc.setFont("helvetica", emphasis ? "bold" : "normal");
      doc.setFontSize(7.4);
      doc.setTextColor(...(emphasis ? PDF_COLORS.text : PDF_COLORS.muted));
      doc.text(label, textX, rowY + rowHeight / 2 + 1.4, { maxWidth: width * 0.42 });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.4);
      doc.setTextColor(...(emphasis ?? PDF_COLORS.text));
      doc.text(hotelDocText(value), x + width - 6, rowY + rowHeight / 2 + 1.4, {
        align: "right",
        maxWidth: width * 0.5,
      });
    }
  });
  return y + height;
}

export type HotelBadgeCard = { label: string; value: string };

/** Compact side-by-side badge cards (e.g. "Référence" / "Date d'émission") between the header and the first info blocks. */
export function renderHotelBadgeRow(doc: jsPDF, cards: HotelBadgeCard[], y: number): number {
  const gap = 5;
  const height = 16;
  const width = (HOTEL_CONTENT_WIDTH - gap * (cards.length - 1)) / cards.length;
  cards.forEach((card, index) => {
    const x = HOTEL_MARGIN + index * (width + gap);
    doc.setDrawColor(...PDF_COLORS.line);
    doc.setFillColor(...PDF_COLORS.surface);
    doc.roundedRect(x, y, width, height, 2.5, 2.5, "FD");
    doc.setFillColor(...PDF_COLORS.primary);
    doc.circle(x + 8, y + 6, 1.4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.6);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.setCharSpace(0.4);
    doc.text(card.label.toUpperCase(), x + 12.5, y + 7, { maxWidth: width - 18 });
    doc.setCharSpace(0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(hotelDocText(card.value), x + 8, y + 13, { maxWidth: width - 16 });
  });
  return y + height;
}

export type HotelInvoiceItem = { label: string; quantity: number; unitPrice: number };

/** Désignation / Quantité / Prix unitaire / Montant table. */
export function renderHotelItemsTable(doc: jsPDF, items: HotelInvoiceItem[], y: number): number {
  const body: HotelPdfCell[][] = items.map((item) => [
    item.label,
    String(item.quantity),
    formatMoney(item.unitPrice),
    formatMoney(item.quantity * item.unitPrice),
  ]);
  return hotelPdfTable(doc, ["Désignation", "Quantité", "Prix unitaire", "Montant"], body, y, {
    columnStyles: {
      0: { cellPadding: { top: 4, right: 3, bottom: 4, left: 13 } },
      1: { halign: "right", cellWidth: 24 },
      2: { halign: "right", cellWidth: 40 },
      3: { halign: "right", cellWidth: 40 },
    },
    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        const cy = data.cell.y + data.cell.height / 2;
        drawHotelIcon(doc, "bed", data.cell.x + 6, cy, 5.6, [255, 255, 255], PDF_COLORS.primary);
      }
    },
  });
}

export type HotelSummaryRow = { label: string; value: string; emphasized?: boolean };

/** Simple right-aligned summary block, used by lighter documents (confirmation). */
export function renderHotelSummaryBlock(
  doc: jsPDF,
  title: string,
  rows: HotelSummaryRow[],
  y: number,
): number {
  const width = 96;
  const x = HOTEL_PAGE_WIDTH - HOTEL_MARGIN - width;
  const rowHeight = 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text(title.toUpperCase(), x, y + 5);
  doc.setDrawColor(...PDF_COLORS.secondary);
  doc.setLineWidth(0.6);
  doc.line(x, y + 8, x + width, y + 8);
  rows.forEach((row, index) => {
    const rowY = y + 11 + index * rowHeight;
    doc.setFont("helvetica", row.emphasized ? "bold" : "normal");
    doc.setFontSize(row.emphasized ? 9 : 8.2);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(row.label, x, rowY + 6);
    doc.text(row.value, x + width, rowY + 6, { align: "right", maxWidth: 46 });
    doc.setDrawColor(...PDF_COLORS.line);
    doc.setLineWidth(0.2);
    doc.line(x, rowY + rowHeight, x + width, rowY + rowHeight);
  });
  return y + 11 + rows.length * rowHeight;
}

export type HotelEstimateRow = { label: string; value: string; kind?: "total" | "highlight" };

/**
 * Full-width "Estimation du séjour" card for the reservation confirmation —
 * replaces the old narrow right-aligned summary block so there is no dead
 * white zone between the client/stay cards and the footer, and makes the
 * total estimate the most visible figure via a highlighted row.
 */
export function renderHotelEstimateCard(doc: jsPDF, title: string, rows: HotelEstimateRow[], y: number): number {
  const width = HOTEL_CONTENT_WIDTH;
  const x = HOTEL_MARGIN;
  const rowHeight = 8.4;
  const highlightExtra = 3;
  const headerHeight = 13;
  const bodyHeight = rows.reduce((sum, row) => sum + rowHeight + (row.kind === "highlight" ? highlightExtra : 0), 0);
  const height = headerHeight + bodyHeight + 5;

  doc.setFillColor(...PDF_COLORS.surface);
  doc.roundedRect(x, y, width, height, 2.5, 2.5, "F");
  doc.setFillColor(...PDF_COLORS.secondary);
  doc.roundedRect(x, y, 2, height, 1, 1, "F");
  drawHotelIcon(doc, "chart", x + 10, y + 8, 4.4, PDF_COLORS.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text(title.toUpperCase(), x + 16, y + 9.3);
  doc.setDrawColor(...PDF_COLORS.secondary);
  doc.setLineWidth(0.5);
  doc.line(x + 8, y + headerHeight, x + width - 8, y + headerHeight);

  let rowY = y + headerHeight + 7;
  rows.forEach((row) => {
    if (row.kind === "highlight") {
      doc.setFillColor(
        PDF_COLORS.secondary[0] + (255 - PDF_COLORS.secondary[0]) * 0.85,
        PDF_COLORS.secondary[1] + (255 - PDF_COLORS.secondary[1]) * 0.85,
        PDF_COLORS.secondary[2] + (255 - PDF_COLORS.secondary[2]) * 0.85,
      );
      doc.roundedRect(x + 6, rowY - 5.5, width - 12, rowHeight + highlightExtra, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(...PDF_COLORS.primary);
      doc.text(row.label, x + 10, rowY + 1.2);
      doc.setFontSize(13);
      doc.text(row.value, x + width - 10, rowY + 1.2, { align: "right" });
      rowY += rowHeight + highlightExtra;
      return;
    }
    const isTotal = row.kind === "total";
    doc.setFont("helvetica", isTotal ? "bold" : "normal");
    doc.setFontSize(isTotal ? 9.5 : 8.4);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(row.label, x + 10, rowY);
    doc.text(row.value, x + width - 10, rowY, { align: "right" });
    rowY += rowHeight;
  });

  return y + height;
}

export type HotelFinancialTotals = {
  subtotal: number;
  discount: number;
  grandTotal: number;
  paidTotal: number;
  balanceDue: number;
  status: string;
  paymentMethod?: string | null;
};

export type HotelPaymentHistoryRow = { date: string; amount: string; method: string; reference: string };

/** "HISTORIQUE DES PAIEMENTS" card — Date / Montant / Mode / Référence, sized to match the RÉSUMÉ card. */
function renderHotelPaymentHistoryCard(
  doc: jsPDF,
  payments: HotelPaymentHistoryRow[],
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  doc.setDrawColor(...PDF_COLORS.line);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, width, height, 2.5, 2.5, "FD");
  drawHotelIcon(doc, "clock", x + 8, y + 8, 4, PDF_COLORS.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text("HISTORIQUE DES PAIEMENTS", x + 13, y + 9.2, { maxWidth: width - 18 });

  const tableX = x + 5;
  const tableWidth = width - 10;
  const headerY = y + 13.5;
  const headerHeight = 6.2;
  const colRatios = [0.24, 0.27, 0.27, 0.22];
  const colWidths = colRatios.map((ratio) => tableWidth * ratio);
  const colX = colWidths.reduce<number[]>((acc, w, index) => {
    acc.push(index === 0 ? tableX : acc[index - 1] + colWidths[index - 1]);
    return acc;
  }, []);

  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(tableX, headerY, tableWidth, headerHeight, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  ["DATE", "MONTANT", "MODE", "RÉFÉRENCE"].forEach((label, index) => {
    doc.text(label, colX[index] + 1.5, headerY + headerHeight / 2 + 1.2, { maxWidth: colWidths[index] - 2 });
  });

  const rowHeight = 6.4;
  const bodyAvailable = height - (headerY - y) - headerHeight - 2;
  const maxRows = Math.max(1, Math.floor(bodyAvailable / rowHeight));
  const visible = payments.slice(0, maxRows);

  if (!visible.length) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.3);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text("Aucun paiement enregistré.", tableX + tableWidth / 2, headerY + headerHeight + rowHeight, {
      align: "center",
      maxWidth: tableWidth - 6,
    });
    return;
  }

  visible.forEach((payment, index) => {
    const rowY = headerY + headerHeight + index * rowHeight;
    if (index % 2 === 1) {
      doc.setFillColor(...PDF_COLORS.alternate);
      doc.rect(tableX, rowY, tableWidth, rowHeight, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.3);
    doc.setTextColor(...PDF_COLORS.text);
    [payment.date, payment.amount, payment.method, payment.reference].forEach((cellText, colIndex) => {
      doc.text(cellText, colX[colIndex] + 1.5, rowY + rowHeight / 2 + 1.1, { maxWidth: colWidths[colIndex] - 2 });
    });
    doc.setDrawColor(...PDF_COLORS.line);
    doc.setLineWidth(0.15);
    doc.line(tableX, rowY + rowHeight, tableX + tableWidth, rowY + rowHeight);
  });

  if (payments.length > visible.length) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.2);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(
      `+ ${payments.length - visible.length} autre(s) paiement(s)`,
      tableX + tableWidth / 2,
      headerY + headerHeight + visible.length * rowHeight + 3.6,
      { align: "center" },
    );
  }
}

/**
 * Financial section: a "RÉSUMÉ" line-item card (with a highlighted "RESTE À
 * PAYER" row and the mode de paiement folded in as the last line) and, when
 * a payment history is supplied, a same-height "HISTORIQUE DES PAIEMENTS"
 * card started on the same line — a single source of truth for the totals,
 * no duplicate "montant total" block.
 */
export function renderHotelFinancialSummary(
  doc: jsPDF,
  totals: HotelFinancialTotals,
  y: number,
  payments?: HotelPaymentHistoryRow[],
  options?: { highlightGold?: boolean },
): number {
  const gap = 6;
  const hasHistory = payments !== undefined;
  const leftWidth = hasHistory ? (HOTEL_CONTENT_WIDTH - gap) / 2 : HOTEL_CONTENT_WIDTH;
  const rightWidth = HOTEL_CONTENT_WIDTH - gap - leftWidth;
  const leftX = HOTEL_MARGIN;
  const rightX = leftX + leftWidth + gap;

  type Row = { label: string; value: string; kind?: "total" | "highlight"; boldValue?: boolean };
  const rows: Row[] = [
    { label: "Sous-total", value: formatMoney(totals.subtotal) },
    ...(totals.discount > 0 ? [{ label: "Remise", value: `- ${formatMoney(totals.discount)}` }] : []),
    { label: "TOTAL", value: formatMoney(totals.grandTotal), kind: "total" as const },
    { label: "Déjà payé", value: formatMoney(totals.paidTotal) },
    { label: "RESTE À PAYER", value: formatMoney(totals.balanceDue), kind: "highlight" as const },
    ...(totals.paymentMethod
      ? [{ label: "Mode de paiement", value: hotelDocText(totals.paymentMethod), boldValue: true }]
      : []),
  ];
  const rowHeight = 8.4;
  const highlightExtra = 2;
  const cardHeight = 12 + rows.length * rowHeight + highlightExtra;

  doc.setFillColor(...PDF_COLORS.surface);
  doc.roundedRect(leftX, y, leftWidth, cardHeight, 2.5, 2.5, "F");
  doc.setFillColor(...PDF_COLORS.secondary);
  doc.roundedRect(leftX, y, 2, cardHeight, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text("RÉSUMÉ", leftX + 8, y + 8.5);

  let rowY = y + 14;
  const highlightGold = options?.highlightGold ?? false;
  const highlightColor = hotelStatusColor(totals.status);
  rows.forEach((row) => {
    if (row.kind === "highlight") {
      if (highlightGold) {
        doc.setFillColor(...PDF_COLORS.secondary);
      } else {
        doc.setFillColor(
          highlightColor[0] + (255 - highlightColor[0]) * 0.85,
          highlightColor[1] + (255 - highlightColor[1]) * 0.85,
          highlightColor[2] + (255 - highlightColor[2]) * 0.85,
        );
      }
      doc.roundedRect(leftX + 5, rowY - 5.5, leftWidth - 10, rowHeight + highlightExtra, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      const highlightTextColor: [number, number, number] = highlightGold
        ? [255, 255, 255]
        : highlightColor;
      doc.setTextColor(...highlightTextColor);
      doc.text(row.label, leftX + 8, rowY + 1.2);
      doc.text(row.value, leftX + leftWidth - 8, rowY + 1.2, { align: "right" });
      rowY += rowHeight + highlightExtra;
      return;
    }
    const isTotal = row.kind === "total";
    doc.setTextColor(...PDF_COLORS.text);
    doc.setFont("helvetica", isTotal ? "bold" : "normal");
    doc.setFontSize(isTotal ? 10 : 8.4);
    doc.text(row.label, leftX + 8, rowY);
    doc.setFont("helvetica", isTotal || row.boldValue ? "bold" : "normal");
    doc.text(row.value, leftX + leftWidth - 8, rowY, { align: "right" });
    if (isTotal) {
      doc.setDrawColor(...PDF_COLORS.line);
      doc.setLineWidth(0.3);
      doc.line(leftX + 5, rowY + 3.2, leftX + leftWidth - 5, rowY + 3.2);
    }
    rowY += rowHeight;
  });

  if (hasHistory) {
    renderHotelPaymentHistoryCard(doc, payments!, rightX, y, rightWidth, cardHeight);
  }

  return y + cardHeight;
}

export type HotelFooterOptions = {
  tenant: PdfTenant;
  signatureUrl?: string | null;
  stampUrl?: string | null;
  thankYouMessage?: string;
  /**
   * Y position right after the document's own content (e.g. last info
   * block's bottom + a small gap). When provided, the footer starts there
   * instead of being pinned to a fixed distance from the bottom — this
   * avoids a large dead zone on short documents (e.g. a payment receipt)
   * while never sitting lower than the default pinned position.
   */
  contentBottom?: number;
  /** Set to false to omit the bottom legal strip. Defaults to true. */
  legalNotice?: boolean;
  /**
   * When supplied (with at least one field filled in), the bottom strip shows
   * a compact centered RCCM / N° contribuable / site internet line under the
   * gold divider instead of the generic "document informatisé" disclaimer.
   */
  legalInfo?: { rccm?: string | null; taxNumber?: string | null; website?: string | null } | null;
  /**
   * Overrides the two lines shown by the generic disclaimer (only used when
   * `legalInfo` isn't provided). Defaults to the "document informatisé"
   * wording used by every document except the invoice.
   */
  disclaimerLines?: [string, string];
  /** Set to false to omit the decorative badge next to the disclaimer text. Defaults to true. */
  disclaimerBadge?: boolean;
};

/**
 * Footer: remerciement + contact réception (gauche), signature/cachet du
 * tenant courant (droite, ratio préservé, zone vide si absente), puis une
 * mention informative générique et un discret repère décoratif — sans QR
 * code et sans mention "Document généré par ...".
 */
/**
 * Draws one bordered, titled box (signature OR cachet) at the given position
 * and, if `imageUrl` resolves, fits the image inside preserving its ratio.
 */
export async function renderHotelSignatureBox(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  titleSpace: number,
  title: string,
  imageUrl: string,
): Promise<void> {
  doc.setDrawColor(...PDF_COLORS.secondary);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, width, height, 2, 2, "D");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text(title, x + width / 2, y + 5, { align: "center" });

  try {
    const data = await imageData(imageUrl);
    const properties = doc.getImageProperties(data);
    const ratio = properties.width / properties.height;
    const padding = 2;
    const maxW = width - padding * 2;
    const maxH = height - titleSpace - padding * 2;
    let w = maxW;
    let h = w / ratio;
    if (h > maxH) {
      h = maxH;
      w = h * ratio;
    }
    doc.addImage(
      data,
      properties.fileType || "PNG",
      x + (width - w) / 2,
      y + titleSpace + (height - titleSpace - h) / 2,
      w,
      h,
    );
  } catch (error) {
    console.warn("Signature/cachet PDF indisponible.", error);
  }
}

export async function renderHotelDocumentFooter(doc: jsPDF, options: HotelFooterOptions): Promise<void> {
  const { tenant, signatureUrl, stampUrl } = options;
  const thankYouMessage = options.thankYouMessage ?? "Merci de votre confiance.";
  const width = HOTEL_PAGE_WIDTH;
  const height = doc.internal.pageSize.getHeight();
  const margin = HOTEL_MARGIN;

  const pinnedY = height - 34;
  const contentY = options.contentBottom != null ? Math.min(pinnedY, options.contentBottom) : pinnedY;

  drawHotelIcon(doc, "bell", margin + 5, contentY - 3, 10, [255, 255, 255], PDF_COLORS.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text(thankYouMessage, margin + 13, contentY - 4.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text("Nous vous souhaitons un agréable séjour.", margin + 13, contentY);
  const contactLines: Array<[HotelIconType, string]> = [];
  if (tenant.phone) contactLines.push(["phone", `Réception : ${tenant.phone}`]);
  if (tenant.email) contactLines.push(["mail", `Email : ${tenant.email}`]);
  let contactY = contentY + 5.5;
  contactLines.forEach(([icon, text]) => {
    drawHotelIcon(doc, icon, margin + 14.5, contactY - 1.3, 3, PDF_COLORS.muted);
    doc.text(text, margin + 18, contactY, { maxWidth: 100 });
    contactY += 4.4;
  });
  const leftBottom = contactLines.length ? contactY - 4.4 : contentY;

  const hasSignature = Boolean(signatureUrl);
  const hasStamp = Boolean(stampUrl);
  const boxWidth = 52;
  const boxHeight = 23;
  const boxX = width - margin - boxWidth;
  const boxY = contentY - 4;
  const titleSpace = 6.5;

  let boxBottom = leftBottom;
  if (hasSignature && hasStamp) {
    const gap = 2;
    const halfWidth = (boxWidth - gap) / 2;
    await renderHotelSignatureBox(
      doc,
      boxX,
      boxY,
      halfWidth,
      boxHeight,
      titleSpace,
      "SIGNATURE",
      signatureUrl!,
    );
    await renderHotelSignatureBox(
      doc,
      boxX + halfWidth + gap,
      boxY,
      halfWidth,
      boxHeight,
      titleSpace,
      "CACHET",
      stampUrl!,
    );
    boxBottom = boxY + boxHeight;
  } else if (hasSignature) {
    await renderHotelSignatureBox(
      doc,
      boxX,
      boxY,
      boxWidth,
      boxHeight,
      titleSpace,
      "SIGNATURE",
      signatureUrl!,
    );
    boxBottom = boxY + boxHeight;
  } else if (hasStamp) {
    await renderHotelSignatureBox(
      doc,
      boxX,
      boxY,
      boxWidth,
      boxHeight,
      titleSpace,
      "CACHET",
      stampUrl!,
    );
    boxBottom = boxY + boxHeight;
  }

  if (options.legalNotice ?? true) {
    const legalInfo = options.legalInfo;
    const legalInfoProvided = options.legalInfo !== undefined;
    const legalItems: Array<[HotelIconType, string]> = [];
    if (legalInfo?.rccm) legalItems.push(["shield", `RCCM : ${legalInfo.rccm}`]);
    if (legalInfo?.taxNumber) legalItems.push(["building", `N° Contribuable : ${legalInfo.taxNumber}`]);
    if (legalInfo?.website) legalItems.push(["globe", legalInfo.website]);
    // The two-line disclaimer needs more clearance below the gold rule than
    // the single-line legalItems row, or its first line's ascent collides
    // with the rule. Reserve 4mm more at the bottom for it specifically so
    // the block still ends at its usual distance from the page edge instead
    // of just pushing everything down.
    const showsDisclaimer = !legalInfoProvided;
    const blockBottom = Math.max(leftBottom, boxBottom);
    const defaultLineY = height - (showsDisclaimer ? 19 : 15);
    const lineY = Math.min(defaultLineY, blockBottom + 7);
    const bottomLineY = lineY + 5;

    doc.setDrawColor(...PDF_COLORS.secondary);
    doc.setLineWidth(0.4);
    doc.line(margin, lineY, width - margin, lineY);

    if (legalItems.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.6);
      const iconSize = 3.2;
      const textGap = 3;
      const sepGap = 8;
      const itemWidths = legalItems.map(([, text]) => iconSize + textGap + doc.getTextWidth(text));
      const totalWidth = itemWidths.reduce((sum, w) => sum + w, 0) + sepGap * (legalItems.length - 1);
      let cursorX = margin + (width - margin * 2 - totalWidth) / 2;
      legalItems.forEach(([icon, text], index) => {
        drawHotelIcon(doc, icon, cursorX + iconSize / 2, bottomLineY - 2, iconSize, PDF_COLORS.primary);
        doc.setTextColor(...PDF_COLORS.muted);
        doc.text(text, cursorX + iconSize + textGap, bottomLineY - 1);
        cursorX += itemWidths[index];
        if (index < legalItems.length - 1) {
          doc.setDrawColor(...PDF_COLORS.line);
          doc.setLineWidth(0.25);
          doc.line(cursorX + sepGap / 2, bottomLineY - 4, cursorX + sepGap / 2, bottomLineY + 0.5);
          cursorX += sepGap;
        }
      });
    } else if (showsDisclaimer) {
      const [line1, line2] = options.disclaimerLines ?? [
        "Ce document est informatisé et ne nécessite",
        "aucune signature manuscrite.",
      ];
      const showBadge = options.disclaimerBadge ?? true;
      // Clear, un-ambiguous gap under the rule: the first baseline sits 6mm
      // below it (comfortably clearing the ~2mm font ascent, unlike the old
      // 1mm gap that let the rule cut through the glyphs), then 4mm between
      // the two lines, same as before.
      const line1Y = lineY + 6;
      const line2Y = line1Y + 4;
      drawHotelIcon(doc, "shield", margin + 3, (line1Y + line2Y) / 2, 5.5, PDF_COLORS.primary);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.2);
      doc.setTextColor(...PDF_COLORS.muted);
      doc.text(line1, margin + 8, line1Y, { maxWidth: 78 });
      doc.text(line2, margin + 8, line2Y, { maxWidth: 78 });
      if (showBadge) {
        drawHotelIcon(
          doc,
          "medal",
          width / 2,
          (line1Y + line2Y) / 2,
          6.5,
          [255, 255, 255],
          PDF_COLORS.secondary,
        );
      }
    }
  }
}
