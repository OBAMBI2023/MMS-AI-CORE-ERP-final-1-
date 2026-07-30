import { jsPDF } from "jspdf";
import { QuotationData, CompanySettings } from "./pdf-types";
import {
  renderPremiumDocumentHeader,
  renderFooter,
  renderTable,
  renderTotals,
  renderSignatureAndStamp,
} from "./pdf-template-engine";
import { toast } from "sonner";
import { downloadPdf } from "./download-pdf";

export async function generateDevisPDF(
  quote: QuotationData,
  settings: CompanySettings,
  images: { logo?: string | null; signature?: string | null; cachet?: string | null } = {},
) {
  try {
    if (!quote || !quote.numero || !quote.items || quote.items.length === 0) {
      toast.error("Données du devis incomplètes pour la génération du PDF.");
      return;
    }

    const doc = new jsPDF();

    const afterHeaderY = await renderPremiumDocumentHeader(doc, settings, "Devis", images.logo, [
      { label: "Numéro", value: quote.numero },
      { label: "Date", value: quote.date },
      { label: "Expiration", value: quote.dateExpiration || "-" },
    ]);

    // Customer Info
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    doc.text("Informations du client", 10, afterHeaderY + 5);
    doc.text(quote.client.nom, 10, afterHeaderY + 10);
    if (quote.client.entreprise) doc.text(quote.client.entreprise, 10, afterHeaderY + 15);
    if (quote.client.telephone) doc.text(quote.client.telephone, 10, afterHeaderY + 20);
    if (quote.client.email) doc.text(quote.client.email, 10, afterHeaderY + 25);

    // Items Table
    renderTable(doc, quote.items, afterHeaderY + 32, settings.currency, settings.decimals);

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    renderTotals(doc, quote.totals, finalY, settings.currency, settings.decimals);

    // Footer, Signature and Stamp
    if (images.signature) {
      await renderSignatureAndStamp(doc, images.signature, images.cachet || null);
    }

    renderFooter(doc, settings);

    // Filename: DEV-YYYYMMDD-ID.pdf
    const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const filename = `DEV-${dateStr}-${quote.numero}.pdf`;

    await downloadPdf(doc, filename);
    toast.success("PDF généré avec succès.");
  } catch (error) {
    console.error("PDF generation failed:", error);
    toast.error("Erreur lors de la génération du PDF.");
  }
}
