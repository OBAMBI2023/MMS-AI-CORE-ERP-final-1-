import type { jsPDF } from "jspdf";
import type { UserOptions } from "jspdf-autotable";
import {
  renderPdfContactBlock,
  renderPdfFooter,
  renderPdfHeader,
  renderPdfNotes,
  renderPdfSectionTitle,
  renderPdfTable,
  renderPdfTotals,
  type PdfContactBlock,
  type PdfSummaryItem,
  type PdfTenant,
} from "./PdfTheme";

/**
 * Shared A4 layout façade. All PDF exports use this API so pagination,
 * table behavior, totals and footers remain consistent.
 */
export const PdfLayoutEngine = {
  createDocument(doc: jsPDF) {
    return doc;
  },
  header(
    doc: jsPDF,
    tenant: PdfTenant,
    title: string,
    summary: PdfSummaryItem[] = [],
  ) {
    return renderPdfHeader(doc, tenant, title, summary);
  },
  contact(doc: jsPDF, contact: PdfContactBlock, y: number) {
    return renderPdfContactBlock(doc, contact, y);
  },
  section(doc: jsPDF, title: string, y: number) {
    return renderPdfSectionTitle(doc, title, y);
  },
  table(
    doc: jsPDF,
    head: string[],
    body: Array<Array<string | number>>,
    y: number,
    options: Partial<UserOptions> = {},
  ) {
    return renderPdfTable(doc, head, body, y, options);
  },
  totals(
    doc: jsPDF,
    rows: Array<{ label: string; value: string; hidden?: boolean }>,
    y: number,
  ) {
    return renderPdfTotals(doc, rows, y);
  },
  notes(
    doc: jsPDF,
    sections: Array<{ title: string; text?: string | null }>,
    y: number,
  ) {
    return renderPdfNotes(doc, sections, y);
  },
  footer(doc: jsPDF, tenant: PdfTenant, generatedAt = new Date()) {
    renderPdfFooter(doc, tenant, generatedAt);
  },
};

export type { PdfContactBlock, PdfSummaryItem, PdfTenant };
