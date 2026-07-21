import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { CompanySettings, DocumentItem, DocumentTotals } from "./pdf-types";

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
        const dataUrl = await urlToDataURL(logoUrl);
        doc.addImage(dataUrl, 'PNG', 10, 10, 50, 20); // Adjust dimensions as needed
    } catch (error) {
        console.error("Failed to render logo:", error);
    }
}

export async function renderSignatureAndStamp(doc: jsPDF, signatureUrl: string, cachetUrl: string | null) {
    try {
        const x = 140;
        const y = doc.internal.pageSize.height - 50; // Adjust as needed
        const width = 50;
        const height = 30;

        const signatureData = await urlToDataURL(signatureUrl);
        doc.addImage(signatureData, 'PNG', x, y, width, height);

        if (cachetUrl) {
            const cachetData = await urlToDataURL(cachetUrl);
            doc.saveGraphicsState();
            doc.setGState(new (jsPDF as any).GState({ opacity: 0.75 }));
            doc.addImage(cachetData, 'PNG', x, y, width, height);
            doc.restoreGraphicsState();
        }
    } catch (error) {
        console.error("Failed to render signature/stamp:", error);
    }
}

export function renderHeader(doc: jsPDF, settings: CompanySettings, startY: number = 10) {
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235); // Primary color
  doc.text(String(settings.nomCommercial ?? ""), 70, startY);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Secondary color
  doc.text(String(settings.activite ?? ""), 70, startY + 6);
  doc.text(`${String(settings.adresse ?? "")}, ${String(settings.ville ?? "")}, ${String(settings.pays ?? "")}`, 70, startY + 11);
  doc.text(`Tél: ${String(settings.telephone ?? "")} | Email: ${String(settings.email ?? "")}`, 70, startY + 16);
  doc.text(`RCCM: ${String(settings.rccm ?? "")} | CC: ${String(settings.cc ?? "")} | IFU: ${String(settings.ifu ?? "")}`, 70, startY + 21);

  return startY + 30;
}

export function renderFooter(doc: jsPDF, settings: CompanySettings) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Page ${i} de ${pageCount} - ${settings.nomCommercial}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: "center" }
    );
  }
}

export function renderTable(doc: jsPDF, items: DocumentItem[], startY: number) {
  autoTable(doc, {
    startY: startY,
    head: [["Description", "Qté", "Prix U.", "Remise", "TVA", "Montant"]],
    body: items.map(item => [
      item.description,
      item.quantite.toString(),
      item.prixUnitaire.toString(),
      item.remise.toString(),
      item.tva.toString(),
      item.montant.toString()
    ]),
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235] },
  });
}

export function renderTotals(doc: jsPDF, totals: DocumentTotals, startY: number) {
  const rightMargin = 190;
  doc.setFontSize(10);
  doc.text(`Sous-total: ${totals.sousTotal}`, rightMargin, startY, { align: "right" });
  doc.text(`Remise: ${totals.remise}`, rightMargin, startY + 5, { align: "right" });
  doc.text(`TVA: ${totals.tva}`, rightMargin, startY + 10, { align: "right" });
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text(`Total TTC: ${totals.totalTTC}`, rightMargin, startY + 15, { align: "right" });
  doc.setFont(undefined, 'normal');
}
