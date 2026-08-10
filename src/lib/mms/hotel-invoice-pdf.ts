import { jsPDF } from "jspdf";
import { formatHotelPdfDate, hotelPdfTenant } from "./hotel-pdf-engine";
import {
  ensureHotelFooterSpace,
  hotelDocText,
  hotelInfoBlockHeight,
  renderHotelDocumentFooter,
  renderHotelDocumentHeader,
  renderHotelFinancialSummary,
  renderHotelInfoBlock,
  renderHotelItemsTable,
  HOTEL_CONTENT_WIDTH,
  HOTEL_MARGIN,
  type HotelInvoiceItem,
  type HotelPaymentHistoryRow,
} from "./hotel-pdf-template";
import { safeHotelPdfNumber } from "./hotel-pdf-values";
import { formatMoney, reservationPaymentStatus } from "./hotel-reservation-pdf-values";
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
  guestName: string;
  guestPhone?: string | null;
  guestEmail?: string | null;
  roomNumber: string;
};

export type HotelInvoiceExtraItem = { label: string; quantity: number; unitPrice: number };
export type HotelInvoicePaymentHistoryItem = {
  date: string;
  amount: number;
  method: string | null;
  reference?: string | null;
};

export function reservationFinancialSummary(invoice: HotelInvoiceData) {
  const grandTotal = safeHotelPdfNumber(invoice.grand_total);
  const discount = safeHotelPdfNumber(invoice.discount);
  const subtotal = grandTotal + discount;
  const paidTotal = safeHotelPdfNumber(invoice.paid_total);
  const balanceDue = Math.max(0, safeHotelPdfNumber(invoice.balance_due));
  return { subtotal, discount, grandTotal, paidTotal, balanceDue };
}

export async function createHotelInvoicePdf(
  invoice: HotelInvoiceData,
  settings?: Record<string, unknown> | null,
  logoUrl?: string | null,
  signatureUrl?: string | null,
  extras: HotelInvoiceExtraItem[] = [],
  payments: HotelInvoicePaymentHistoryItem[] = [],
) {
  const reference = `FACT-${hotelDocText(invoice.id, "RESERVATION")
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
    { type: "Facture", number: reference, date: formatHotelPdfDate(new Date()) },
    { rccm: (rawSettings?.rccm as string | null) ?? null, taxNumber: (rawSettings?.tax_number as string | null) ?? null },
  );

  const gap = 5;
  const blockWidth = (HOTEL_CONTENT_WIDTH - gap) / 2;
  const clientRowCount = 3;
  const stayRowCount = 4;
  const infoBlockHeight = Math.max(
    hotelInfoBlockHeight(clientRowCount, "stacked"),
    hotelInfoBlockHeight(stayRowCount, "inline"),
  );
  const clientBottom = renderHotelInfoBlock(
    doc,
    "Client",
    "person",
    [
      ["person", "Nom du client", hotelDocText(invoice.guestName)],
      ["phone", "Téléphone", hotelDocText(invoice.guestPhone)],
      ["mail", "Email", hotelDocText(invoice.guestEmail)],
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
      ["bed", "Logement", hotelDocText(invoice.roomNumber)],
      ["calendar", "Date d’arrivée", formatHotelPdfDate(invoice.check_in)],
      ["calendar", "Date de départ", formatHotelPdfDate(invoice.check_out)],
      ["moon", "Nombre de nuits", String(safeHotelPdfNumber(invoice.nights))],
    ],
    stayX,
    y,
    blockWidth,
    "inline",
    infoBlockHeight,
  );
  const status = reservationPaymentStatus(invoice.paid_total, invoice.balance_due);

  y = Math.max(clientBottom, stayBottom) + 9;

  const items: HotelInvoiceItem[] = [
    {
      label: `Hébergement — ${safeHotelPdfNumber(invoice.nights)} nuit(s)`,
      quantity: safeHotelPdfNumber(invoice.nights),
      unitPrice: safeHotelPdfNumber(invoice.nightly_rate),
    },
    ...extras.map((extra) => ({
      label: hotelDocText(extra.label),
      quantity: safeHotelPdfNumber(extra.quantity),
      unitPrice: safeHotelPdfNumber(extra.unitPrice),
    })),
  ];
  y = renderHotelItemsTable(doc, items, y) + 6;
  y = ensureHotelFooterSpace(doc, y);

  const { subtotal, discount, grandTotal, paidTotal, balanceDue } = reservationFinancialSummary(invoice);
  const lastPaymentMethod = payments[0]?.method;
  const historyRows: HotelPaymentHistoryRow[] = payments.map((payment) => ({
    date: formatHotelPdfDate(payment.date),
    amount: formatMoney(payment.amount),
    method: hotelDocText(payment.method),
    reference: hotelDocText(payment.reference, "—"),
  }));
  y = renderHotelFinancialSummary(
    doc,
    { subtotal, discount, grandTotal, paidTotal, balanceDue, status, paymentMethod: lastPaymentMethod },
    y,
    historyRows,
  );
  ensureHotelFooterSpace(doc, y);

  await renderHotelDocumentFooter(doc, { tenant, signatureUrl });

  return { doc, number: reference, filename: `facture-${reference}.pdf` };
}
