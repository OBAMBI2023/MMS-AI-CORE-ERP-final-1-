import { jsPDF } from "jspdf";
import type { UserOptions } from "jspdf-autotable";
import { PdfLayoutEngine } from "./PdfLayoutEngine";
import {
  formatPdfCurrency,
  formatPdfDate,
  tenantFromSettings,
  type PdfSummaryItem,
  type PdfTenant,
} from "./PdfTheme";
import { safeHotelPdfNumber, safeHotelPdfText, validHotelPdfDate } from "./hotel-pdf-values";
export { safeHotelPdfNumber, safeHotelPdfText } from "./hotel-pdf-values";

export type HotelPdfCell = string | number | null | undefined;
export type HotelPdfSettings = Record<string, unknown> | null | undefined;

export function formatHotelPdfAmount(value: unknown): string {
  return formatPdfCurrency(safeHotelPdfNumber(value), "FCFA", 0);
}

export function formatHotelPdfDate(value: unknown): string {
  const date = validHotelPdfDate(value);
  return date ? formatPdfDate(date) : "—";
}

export function hotelPdfTenant(settings?: HotelPdfSettings, logoUrl?: string | null): PdfTenant {
  return { ...tenantFromSettings(settings, logoUrl), currency: "FCFA", decimals: 0 };
}

export async function createHotelPdf(
  title: string,
  settings?: HotelPdfSettings,
  logoUrl?: string | null,
  summary: PdfSummaryItem[] = [],
  orientation: "portrait" | "landscape" = "portrait",
) {
  const doc = new jsPDF({ format: "a4", unit: "mm", orientation });
  doc.setCharSpace(0);
  const tenant = hotelPdfTenant(settings, logoUrl);
  const y = await PdfLayoutEngine.header(doc, tenant, title, summary);
  return { doc, tenant, y };
}

export function hotelPdfTable(
  doc: jsPDF,
  head: string[],
  body: HotelPdfCell[][],
  y: number,
  options: Partial<UserOptions> = {},
) {
  return PdfLayoutEngine.table(
    doc,
    head.map((cell) => safeHotelPdfText(cell)),
    body.map((row) => row.map((cell) => safeHotelPdfText(cell))),
    y,
    options,
  );
}

export function finishHotelPdf(doc: jsPDF, tenant: PdfTenant) {
  PdfLayoutEngine.footer(doc, tenant);
  return doc;
}

export async function createHotelListPdf(input: {
  title: string;
  filename: string;
  head: string[];
  body: HotelPdfCell[][];
  settings?: HotelPdfSettings;
  logoUrl?: string | null;
  summary?: PdfSummaryItem[];
  orientation?: "portrait" | "landscape";
  tableOptions?: Partial<UserOptions>;
}) {
  const { doc, tenant, y } = await createHotelPdf(
    input.title,
    input.settings,
    input.logoUrl,
    input.summary ?? [{ label: "Éléments", value: String(input.body.length) }],
    input.orientation,
  );
  hotelPdfTable(doc, input.head, input.body, y + 2, input.tableOptions);
  finishHotelPdf(doc, tenant);
  return { doc, filename: input.filename };
}
