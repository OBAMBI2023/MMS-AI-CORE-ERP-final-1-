import { jsPDF } from "jspdf";
import type { CompanySettings, DocumentItem, DocumentTotals } from "./pdf-types";
import { formatCurrency } from "./format";
import {
  PDF_COLORS,
  tenantFromSettings,
} from "./PdfTheme";
import { PdfLayoutEngine } from "./PdfLayoutEngine";

async function urlToDataURL(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function renderLogo(doc: jsPDF, logoUrl: string) {
  try {
    const data = await urlToDataURL(logoUrl);
    const properties = doc.getImageProperties(data);
    const ratio = properties.width / properties.height;
    const width = ratio >= 1 ? 10 : 10 * ratio;
    const height = ratio >= 1 ? 10 / ratio : 10;
    doc.addImage(data, "PNG", 18 + (10 - width) / 2, 19 + (10 - height) / 2, width, height);
  } catch (error) {
    console.error("Failed to render logo:", error);
  }
}

export async function renderSignatureAndStamp(
  doc: jsPDF,
  signatureUrl: string,
  cachetUrl: string | null,
  requestedY = 225,
) {
  try {
    const pageHeight = doc.internal.pageSize.getHeight();
    const x = doc.internal.pageSize.getWidth() - 70;
    let y = requestedY;
    if (y + 38 > pageHeight - 18) {
      doc.addPage();
      y = 25;
    }
    doc.setFillColor(...PDF_COLORS.surface);
    doc.setDrawColor(...PDF_COLORS.line);
    doc.roundedRect(x - 5, y - 6, 62, 43, 3, 3, "FD");
    doc.setFillColor(...PDF_COLORS.secondary);
    doc.roundedRect(x - 5, y - 6, 2.5, 43, 1.25, 1.25, "F");
    doc.setTextColor(...PDF_COLORS.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("SIGNATURE ET CACHET", x, y);
    doc.addImage(await urlToDataURL(signatureUrl), "PNG", x, y + 3, 50, 30);
    if (cachetUrl) {
      doc.saveGraphicsState();
      doc.setGState(new (jsPDF as any).GState({ opacity: 0.75 }));
      doc.addImage(await urlToDataURL(cachetUrl), "PNG", x, y + 3, 50, 30);
      doc.restoreGraphicsState();
    }
    return y + 35;
  } catch (error) {
    console.error("Failed to render signature/stamp:", error);
    return requestedY;
  }
}

export function renderHeader(doc: jsPDF, settings: CompanySettings, _startY = 10) {
  const tenant = tenantFromSettings(settings as unknown as Record<string, unknown>);
  doc.setTextColor(11, 31, 58);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(tenant.companyName.toUpperCase(), 200, 22, { align: "right", maxWidth: 140 });
  return 52;
}

export function renderPremiumDocumentHeader(
  doc: jsPDF,
  settings: CompanySettings,
  title: string,
  logoUrl?: string | null,
  summary: Array<{ label: string; value: string }> = [],
) {
  return PdfLayoutEngine.header(
    doc,
    tenantFromSettings(settings as unknown as Record<string, unknown>, logoUrl),
    title,
    summary,
  );
}

export function renderDepensesHeader(doc: jsPDF, settings: CompanySettings, logoUrl: string | null) {
  return renderPremiumDocumentHeader(doc, settings, "Liste des dépenses", logoUrl, [
    { label: "Date d'export", value: new Date().toLocaleDateString("fr-FR") },
    { label: "Type", value: "Dépenses" },
    { label: "Période", value: "Toutes" },
    { label: "Statut", value: "Export validé" },
  ]);
}

export function renderDepensesTable(doc: jsPDF, data: any[], startY: number) {
  return PdfLayoutEngine.table(
    doc,
    ["Date", "Catégorie", "Description", "Mode de paiement", "Montant"],
    data.map((item) => [
      item.date,
      item.category,
      item.description || "-",
      item.payment_method || "-",
      item.amount,
    ]),
    startY,
    { columnStyles: { 4: { halign: "right", fontStyle: "bold" } } },
  );
}

export function renderDepensesTotals(doc: jsPDF, total: string, _startY: number) {
  PdfLayoutEngine.totals(doc, [{ label: "Total des dépenses", value: total }], (doc as any).lastAutoTable.finalY + 7);
}

export function renderTable(
  doc: jsPDF,
  items: DocumentItem[],
  startY: number,
  currency?: string,
  decimals?: number,
) {
  return PdfLayoutEngine.table(
    doc,
    ["Description", "Qté", "Prix U.", "Remise", "TVA", "Montant"],
    items.map((item) => [
      item.description,
      item.quantite,
      formatCurrency(item.prixUnitaire, currency, decimals),
      formatCurrency(item.remise, currency, decimals),
      item.tva,
      formatCurrency(item.montant, currency, decimals),
    ]),
    startY,
    {
      columnStyles: {
        2: { halign: "right" },
        3: { halign: "right" },
        5: { halign: "right", fontStyle: "bold" },
      },
    },
  );
}

export function renderFooter(doc: jsPDF, settings: CompanySettings) {
  PdfLayoutEngine.footer(doc, tenantFromSettings(settings as unknown as Record<string, unknown>));
}

export function renderTotals(
  doc: jsPDF,
  totals: DocumentTotals,
  startY: number,
  currency?: string,
  decimals?: number,
) {
  const rows = [
    { label: "Sous-total", value: formatCurrency(totals.sousTotal, currency, decimals) },
    { label: "Remise", value: formatCurrency(totals.remise, currency, decimals), hidden: Number(totals.remise) <= 0 },
    { label: "TVA", value: formatCurrency(totals.tva, currency, decimals), hidden: Number(totals.tva) <= 0 },
    { label: "Total TTC", value: formatCurrency(totals.totalTTC, currency, decimals) },
  ];
  return PdfLayoutEngine.totals(doc, rows, startY);
}

export function renderDocumentNotes(
  doc: jsPDF,
  sections: Array<{ title: string; text?: string | null }>,
  startY: number,
) {
  return PdfLayoutEngine.notes(doc, sections, startY);
}
