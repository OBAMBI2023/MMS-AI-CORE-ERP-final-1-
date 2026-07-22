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
    doc.addImage(dataUrl, "PNG", 10, 10, 50, 20); // Adjust dimensions as needed
  } catch (error) {
    console.error("Failed to render logo:", error);
  }
}

export async function renderSignatureAndStamp(
  doc: jsPDF,
  signatureUrl: string,
  cachetUrl: string | null,
) {
  try {
    const x = 140;
    const y = doc.internal.pageSize.height - 50; // Adjust as needed
    const width = 50;
    const height = 30;

    const signatureData = await urlToDataURL(signatureUrl);
    doc.addImage(signatureData, "PNG", x, y, width, height);

    if (cachetUrl) {
      const cachetData = await urlToDataURL(cachetUrl);
      doc.saveGraphicsState();
      doc.setGState(new (jsPDF as any).GState({ opacity: 0.75 }));
      doc.addImage(cachetData, "PNG", x, y, width, height);
      doc.restoreGraphicsState();
    }
  } catch (error) {
    console.error("Failed to render signature/stamp:", error);
  }
}

export function renderHeader(doc: jsPDF, settings: CompanySettings, startY: number = 10) {
  // Set primary color
  doc.setTextColor(37, 99, 235);

  // Company Name (Right Aligned)
  doc.setFontSize(22);
  doc.setFont(undefined, "bold");
  doc.text(String(settings.company_name ?? "").toUpperCase(), 200, startY + 10, { align: "right" });

  // Company Info (Right Aligned)
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.setTextColor(50, 50, 50);
  doc.text(String(settings.trade_name ?? ""), 200, startY + 16, { align: "right" });
  doc.text(`${String(settings.address ?? "")}, ${String(settings.city ?? "")}`, 200, startY + 22, {
    align: "right",
  });
  doc.text(
    `Tél: ${String(settings.phone ?? "")} | Email: ${String(settings.email ?? "")}`,
    200,
    startY + 28,
    { align: "right" },
  );

  // Horizontal Line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(10, startY + 32, 200, startY + 32);

  return startY + 40;
}

export function renderFooter(doc: jsPDF, settings: CompanySettings) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Page ${i} de ${pageCount} - ${settings.company_name}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: "center" },
    );
  }
}

export function renderTable(doc: jsPDF, items: DocumentItem[], startY: number) {
  autoTable(doc, {
    startY: startY,
    head: [["Description", "Qté", "Prix U.", "Remise", "TVA", "Montant"]],
    body: items.map((item) => [
      item.description,
      item.quantite.toString(),
      item.prixUnitaire.toString(),
      item.remise.toString(),
      item.tva.toString(),
      item.montant.toString(),
    ]),
    theme: "plain", // Use 'plain' for cleaner look
    headStyles: {
      fillColor: [240, 240, 240], // Light grey background
      textColor: [50, 50, 50],
      fontStyle: "bold",
      lineWidth: 0.1,
      lineColor: [200, 200, 200],
    },
    bodyStyles: {
      lineWidth: 0.1,
      lineColor: [220, 220, 220],
    },
    margin: { left: 10, right: 10 },
  });
}

export function renderTotals(doc: jsPDF, totals: DocumentTotals, startY: number) {
  const rightMargin = 200;

  // Background box
  doc.setFillColor(245, 245, 245);
  doc.rect(130, startY - 5, 75, 25, "F"); // x, y, width, height, 'F'ill

  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.text(`Sous-total: ${totals.sousTotal}`, rightMargin - 5, startY, { align: "right" });
  doc.text(`Remise: ${totals.remise}`, rightMargin - 5, startY + 5, { align: "right" });
  doc.text(`TVA: ${totals.tva}`, rightMargin - 5, startY + 10, { align: "right" });

  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.setTextColor(37, 99, 235); // Primary color
  doc.text(`Total TTC: ${totals.totalTTC}`, rightMargin - 5, startY + 18, { align: "right" });
  doc.setFont(undefined, "normal");
  doc.setTextColor(50, 50, 50);
}
