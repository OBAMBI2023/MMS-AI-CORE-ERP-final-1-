import { jsPDF } from "jspdf";
import type { CompanySettings } from "./pdf-types";
import {
  renderPdfHeader,
  renderPdfTable,
  renderPdfTotalCard,
  tenantFromSettings,
} from "./PdfTheme";

export async function renderAchatsHeader(
  doc: jsPDF,
  settings: CompanySettings,
  logoUrl: string | null,
  totalItems: number,
  totalAmount: string,
) {
  return renderPdfHeader(doc, tenantFromSettings(settings as unknown as Record<string, unknown>, logoUrl), "Liste des achats", [
    { label: "Date d'export", value: new Date().toLocaleDateString("fr-FR") },
    { label: "Nombre d'achats", value: String(totalItems) },
    { label: "Montant total", value: totalAmount },
  ]);
}

export function renderAchatsTable(doc: jsPDF, data: any[], startY: number) {
  return renderPdfTable(
    doc,
    ["Date", "Référence", "Fournisseur", "Montant"],
    data.map((item) => [item.date, item.reference, item.fournisseur, item.amount]),
    startY,
    { columnStyles: { 3: { halign: "right", fontStyle: "bold" } } },
  );
}

export function renderAchatsTotals(doc: jsPDF, total: string) {
  const finalY = (doc as any).lastAutoTable.finalY + 7;
  renderPdfTotalCard(doc, "Total des achats", total, finalY);
}
