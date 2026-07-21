import { jsPDF } from "jspdf";
import { QuotationData, CompanySettings } from "./pdf-types";
import { renderHeader, renderFooter, renderTable, renderTotals, renderLogo, renderSignatureAndStamp } from "./pdf-template-engine";
import { toast } from "sonner";

export async function generateDevisPDF(
  quote: QuotationData, 
  settings: CompanySettings, 
  images: { logo?: string | null, signature?: string | null, cachet?: string | null } = {}
) {
  try {
    if (!quote || !quote.numero || !quote.items || quote.items.length === 0) {
      toast.error("Données du devis incomplètes pour la génération du PDF.");
      return;
    }

    const doc = new jsPDF();
    
    // Render Header and Logo
    let afterHeaderY = renderHeader(doc, settings);
    if (images.logo) {
      await renderLogo(doc, images.logo);
    }

    // Title
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("DEVIS", 105, afterHeaderY + 10, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Numéro: ${quote.numero}`, 105, afterHeaderY + 16, { align: "center" });
    doc.text(`Date: ${quote.date} | Expiration: ${quote.dateExpiration}`, 105, afterHeaderY + 21, { align: "center" });

    // Customer Info
    doc.text("Informations du client:", 10, afterHeaderY + 35);
    doc.text(quote.client.nom, 10, afterHeaderY + 40);
    if (quote.client.entreprise) doc.text(quote.client.entreprise, 10, afterHeaderY + 45);
    if (quote.client.telephone) doc.text(quote.client.telephone, 10, afterHeaderY + 50);
    if (quote.client.email) doc.text(quote.client.email, 10, afterHeaderY + 55);

    // Items Table
    renderTable(doc, quote.items, afterHeaderY + 65);

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    renderTotals(doc, quote.totals, finalY);

    // Footer, Signature and Stamp
    if (images.signature) {
        await renderSignatureAndStamp(doc, images.signature, images.cachet || null);
    }
    
    renderFooter(doc, settings);

    // Filename: DEV-YYYYMMDD-ID.pdf
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `DEV-${dateStr}-${quote.numero}.pdf`;
    
    doc.save(filename);
    toast.success("PDF généré avec succès.");
  } catch (error) {
    console.error("PDF generation failed:", error);
    toast.error("Erreur lors de la génération du PDF.");
  }
}
