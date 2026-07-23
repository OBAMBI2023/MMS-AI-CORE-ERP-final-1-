import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { CompanySettings } from "./pdf-types";
import { renderLogo } from "./pdf-template-engine";

export async function renderAchatsHeader(
  doc: jsPDF,
  settings: CompanySettings,
  logoUrl: string | null,
  totalItems: number,
  totalAmount: string,
) {
  let startY = 10;
  if (logoUrl) {
    await renderLogo(doc, logoUrl);
    startY += 25;
  }

  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.text(String(settings.company_name ?? "").toUpperCase(), 15, startY + 5);

  doc.setFontSize(14);
  doc.setFont(undefined, "normal");
  doc.text("Liste des achats", 15, startY + 12);

  doc.setFontSize(10);
  doc.text(`Date d'export : ${new Date().toLocaleDateString("fr-FR")}`, 15, startY + 20);
  doc.text(`Nombre d'achats : ${totalItems}`, 15, startY + 25);
  doc.text(`Montant total : ${totalAmount}`, 15, startY + 30);

  // Horizontal Line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(10, startY + 35, 200, startY + 35);

  return startY + 45;
}

export function renderAchatsTable(doc: jsPDF, data: any[], startY: number) {
  autoTable(doc, {
    startY: startY,
    head: [["Date", "Référence", "Fournisseur", "Montant"]],
    body: data.map((d) => [d.date, d.reference, d.fournisseur, d.amount]),
    theme: "striped",
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [50, 50, 50],
      fontStyle: "bold",
    },
    margin: { left: 10, right: 10 },
  });
}

export function renderAchatsTotals(doc: jsPDF, total: string) {
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Background box
  doc.setFillColor(240, 240, 240);
  doc.rect(10, finalY, 190, 10, "F");

  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text(`TOTAL DES ACHATS : ${total}`, 15, finalY + 7);
}
