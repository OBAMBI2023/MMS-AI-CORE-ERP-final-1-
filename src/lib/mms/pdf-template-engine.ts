import { jsPDF } from "jspdf";
import type { CompanySettings, DocumentItem, DocumentTotals } from "./pdf-types";
import { formatCurrency } from "./format";
import {
  PDF_COLORS,
  renderPdfFooter,
  renderPdfHeader,
  renderPdfTable,
  renderPdfTotalCard,
  tenantFromSettings,
} from "./PdfTheme";

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
    doc.addImage(await urlToDataURL(logoUrl), "PNG", 18, 19, 21, 21);
  } catch (error) {
    console.error("Failed to render logo:", error);
  }
}

export async function renderSignatureAndStamp(doc: jsPDF, signatureUrl: string, cachetUrl: string | null) {
  try {
    const x = 140;
    const y = doc.internal.pageSize.height - 50;
    doc.addImage(await urlToDataURL(signatureUrl), "PNG", x, y, 50, 30);
    if (cachetUrl) {
      doc.saveGraphicsState();
      doc.setGState(new (jsPDF as any).GState({ opacity: 0.75 }));
      doc.addImage(await urlToDataURL(cachetUrl), "PNG", x, y, 50, 30);
      doc.restoreGraphicsState();
    }
  } catch (error) {
    console.error("Failed to render signature/stamp:", error);
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
  return renderPdfHeader(
    doc,
    tenantFromSettings(settings as unknown as Record<string, unknown>, logoUrl),
    title,
    summary,
  );
}

export function renderDepensesHeader(doc: jsPDF, settings: CompanySettings, logoUrl: string | null) {
  return renderPremiumDocumentHeader(doc, settings, "Liste des dépenses", logoUrl);
}

export function renderDepensesTable(doc: jsPDF, data: any[], startY: number) {
  return renderPdfTable(
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
  renderPdfTotalCard(doc, "Total des dépenses", total, (doc as any).lastAutoTable.finalY + 7);
}

export function renderTable(
  doc: jsPDF,
  items: DocumentItem[],
  startY: number,
  currency?: string,
  decimals?: number,
) {
  return renderPdfTable(
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
  renderPdfFooter(doc, tenantFromSettings(settings as unknown as Record<string, unknown>));
}

export function renderTotals(
  doc: jsPDF,
  totals: DocumentTotals,
  startY: number,
  currency?: string,
  decimals?: number,
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const blockWidth = 88;
  const blockX = pageWidth - 10 - blockWidth;
  const rows = [
    { label: "Sous-total", value: totals.sousTotal },
    ...(Number(totals.remise) > 0 ? [{ label: "Remise", value: totals.remise }] : []),
    ...(Number(totals.tva) > 0 ? [{ label: "TVA", value: totals.tva }] : []),
  ];
  const blockHeight = 5 + rows.length * 8 + 4 + 11 + 4;
  let y = startY;

  if (y + blockHeight > pageHeight - 18) {
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...PDF_COLORS.line);
  doc.setLineWidth(0.25);
  doc.roundedRect(blockX, y, blockWidth, blockHeight, 2.5, 2.5, "FD");

  let rowY = y + 7;
  rows.forEach((row) => {
    doc.setTextColor(...PDF_COLORS.primary);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(row.label, blockX + 5, rowY);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(row.value, currency, decimals), blockX + blockWidth - 5, rowY, {
      align: "right",
      maxWidth: blockWidth - 34,
    });
    rowY += 8;
  });

  doc.setDrawColor(...PDF_COLORS.secondary);
  doc.setLineWidth(0.4);
  doc.line(blockX + 5, rowY - 2, blockX + blockWidth - 5, rowY - 2);

  doc.setTextColor(...PDF_COLORS.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TOTAL TTC", blockX + 5, rowY + 6);

  doc.setTextColor(...PDF_COLORS.secondary);
  doc.setFontSize(13);
  doc.text(
    formatCurrency(totals.totalTTC, currency, decimals),
    blockX + blockWidth - 5,
    rowY + 6,
    { align: "right", maxWidth: blockWidth - 34 },
  );
}
